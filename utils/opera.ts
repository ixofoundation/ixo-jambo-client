import * as amino from '@cosmjs/amino';
import * as base58 from 'bs58';
import * as crypto from '@cosmjs/crypto';
import { DirectSignResponse, OfflineDirectSigner, AccountData, OfflineSigner } from '@cosmjs/proto-signing';
import { OfflineSigner as OfflineAminoSigner, AminoSignResponse, StdSignDoc } from '@cosmjs/launchpad';
import { SignDoc } from '@client-sdk/codec/external/cosmos/tx/v1beta1/tx';

import { b58_to_uint8Arr, b64_to_uint8Arr, uint8Arr_to_b64 } from './encoding';
import { USER } from 'types/user';
import blocksyncApi from './blocksync';
import { TRX_FEE, TRX_MSG } from 'types/transactions';
import * as Toast from '@components/toast/toast';
import { initCustomStargateClient, initStargateClient, sendTransaction } from './client';
import { CHAIN_ID } from '@constants/chains';

const addressIndex = 0;
const signMethod = 'secp256k1';
const pubKeyType = 'EcdsaSecp256k1VerificationKey2019';

interface InterchainWallet {
	getDidDoc: (index: number) => string;
	signMessage: (hexStdSignDoc: string, signMethod: string, addressIndex: number) => Promise<string>;
}

export interface OperaInterchain {
	interchain?: InterchainWallet;
}

export const getOpera = (): InterchainWallet | undefined => {
	if (typeof window !== 'undefined' && window.interchain) return window.interchain;
	return undefined;
};

export const getAccounts = async (): Promise<readonly AccountData[]> => {
	const user = await initializeOpera();
	if (!user) return [];
	else return [{ address: user.address, algo: 'secp256k1', pubkey: user.pubKey as Uint8Array }];
};

// export const signDirect = async (signerAddress: string, signDoc: SignDoc): Promise<DirectSignResponse> => {
// 	const account = (await getAccounts()).find(({ address }) => address === signerAddress);
// 	if (!account) throw new Error(`Address ${signerAddress} not found in wallet`);

// 	const opera = getOpera();
// 	// const sha256msg = crypto.sha256(amino.serializeSignDoc(signDoc));
// 	// const hexValue = Buffer.from(sha256msg).toString('hex');
// 	const signature = await opera!.signMessage(SignDoc as any, signMethod, addressIndex);
// 	const transformedSignature = transformSignature(signature ?? '');
// 	if (!signature || !transformedSignature) throw new Error('No signature, signing failed');
// 	console.log({ signature, transformedSignature });

// 	const stdSignature = {
// 		pub_key: {
// 			type: amino.pubkeyType.secp256k1,
// 			value: uint8Arr_to_b64(account.pubkey),
// 		},
// 		signature: transformedSignature,
// 	};

// 	return { signed: signDoc, signature: stdSignature };
// };

export const signAmino = async (signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> => {
	const account = (await getAccounts()).find(({ address }) => address === signerAddress);
	if (!account) throw new Error(`Address ${signerAddress} not found in wallet`);

	const opera = getOpera();
	const sha256msg = crypto.sha256(amino.serializeSignDoc(signDoc));
	const hexValue = Buffer.from(sha256msg).toString('hex');
	const signature = await opera!.signMessage(hexValue, 'secp256k1', 0);
	const transformedSignature = transformSignature(signature ?? '');
	if (!signature || !transformedSignature) throw new Error('No signature, signing failed');
	console.log({ signature, transformedSignature });

	const stdSignature = {
		pub_key: {
			type: amino.pubkeyType.secp256k1,
			value: uint8Arr_to_b64(account.pubkey),
		},
		signature: transformedSignature,
	};

	return { signed: signDoc, signature: stdSignature };
};

export function transformSignature(signature: string): string | undefined {
	const rawArray = b64_to_uint8Arr(signature);

	let signatureCosmjsBase64 = '';
	if (rawArray.length < 64 || rawArray.length > 66) {
		console.log('operahelper.invalid length');
		return;
	} else if (rawArray.length == 64) {
		signatureCosmjsBase64 = signature;
	} else if (rawArray.length == 65) {
		if (rawArray[0] == 0x00) {
			signatureCosmjsBase64 = uint8Arr_to_b64(rawArray.slice(1, 65));
		} else if (rawArray[32] == 0x00) {
			signatureCosmjsBase64 = uint8Arr_to_b64(new Uint8Array([...rawArray.slice(0, 32), ...rawArray.slice(33, 65)]));
		} else {
			console.log('operahelper.invalid signature array, length 65');
		}
	} else if (rawArray.length == 66) {
		if (rawArray[0] == 0x00 && rawArray[33] == 0x00) {
			signatureCosmjsBase64 = uint8Arr_to_b64(new Uint8Array([...rawArray.slice(1, 33), ...rawArray.slice(34, 66)]));
		} else {
			console.log('operahelper.invalid signature array, length 66');
		}
	}
	console.log('operahelper.signatureCosmjsBase64', signatureCosmjsBase64);
	return signatureCosmjsBase64 || undefined;
}

export const getDIDDocJSON = () => {
	const didDoc = getOpera()?.getDidDoc(0);
	const didDocJSON = JSON.parse(didDoc ?? '{}');
	return didDocJSON;
};

export const initializeOpera = async (): Promise<USER | undefined> => {
	let ledgered = false;
	const didDocJSON = getDIDDocJSON();

	try {
		const getDidDoc = await blocksyncApi.user.getDidDoc(didDocJSON.id);
		console.log({ getDidDoc });
		if (!(getDidDoc as any)?.error) ledgered = true;
	} catch (error) {
		console.log({ error });
	}

	const verificationMethod = didDocJSON.verificationMethod.find((x: any) => x.type == pubKeyType);
	const pubkeyBase58 = verificationMethod.publicKeyBase58;
	const pubkeyByteArray = b58_to_uint8Arr(pubkeyBase58);
	const pubkeyBase64 = uint8Arr_to_b64(pubkeyByteArray);

	const pubkey = {
		type: amino.pubkeyType.secp256k1,
		value: pubkeyBase64,
	};
	const address = amino.pubkeyToAddress(pubkey, 'ixo');

	console.log({ didDocJSON, pubkeyBase64, address });
	return { pubKey: pubkeyBase64, address, ledgered };
};

export const operaBroadCastMessage = async (user: USER, msgs: TRX_MSG[], memo = '', fee: TRX_FEE): Promise<string | null> => {
	const trx_fail = () => {
		Toast.errorToast(`Transaction Failed`);
		return null;
	};

	const address = user.address;
	const offlineSigner = await getOfflineSigner();
	if (!address || !offlineSigner) return trx_fail();
	const client = await initStargateClient(offlineSigner);

	const payload = {
		msgs,
		chain_id: CHAIN_ID,
		fee,
		memo,
	};

	try {
		const result = await sendTransaction(client, address, payload);
		if (result) {
			Toast.successToast(`Transaction Successful`);
			return result.transactionHash;
		} else {
			throw 'transaction failed';
		}
	} catch (e) {
		return trx_fail();
	}
};

// export const getOfflineSigner = async (): Promise<OfflineDirectSigner | null> => {
// 	const opera = getOpera();
// 	if (!opera) return null;
// 	const offlineSigner: OfflineDirectSigner = { getAccounts, signDirect };
// 	return offlineSigner;
// };

export const getOfflineSigner = async (): Promise<OfflineAminoSigner | null> => {
	const opera = getOpera();
	if (!opera) return null;
	const offlineSigner: OfflineAminoSigner = { getAccounts, signAmino };
	return offlineSigner;
};