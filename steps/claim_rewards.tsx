// Page not finished please dont use yet

import { FC, FormEvent, useState, useEffect, useContext } from 'react';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/header/header';
import Footer from '@components/footer/footer';
import { ReviewStepsTypes, STEP, StepDataType, STEPS } from 'types/steps';
import { WalletContext } from '@contexts/wallet';
import ValidatorCard from '@components/validator-card/validator-card';
import { DELEGATION, VALIDATOR, ValidatorConfig } from 'types/validators';
import ValidatorListItem from '@components/validator-list-item/validator-list-item';
import { VALIDATOR_FILTERS } from '@utils/filters';
import { VALIDATOR_FILTER_KEYS as FILTERS } from '@constants/filters';
import Loader from '@components/loader/loader';
import IconText from '@components/icon-text/icon-text';
import { TRX_MSG } from 'types/transactions';
import { defaultTrxFee } from '@utils/transactions';
import { generateWithdrawRewardTrx } from '@utils/client';
import { broadCastMessages } from '@utils/wallets';

type ValidatorAddressProps = {
	onSuccess: (data: StepDataType<STEPS.get_validator_address>) => void;
	onBack?: () => void;
	data?: StepDataType<STEPS.get_validator_address>;
	header?: string;
	message: ReviewStepsTypes;
};

const filterValidators = (validators: VALIDATOR[], filter: string, search: string) => {
	if (!validators?.length) {
		return validators;
	}

	let validatorsToFilter = validators;

	if (search?.length) {
		const searchTerm = search.toLowerCase();
		validatorsToFilter = validatorsToFilter.filter((validator) =>
			validator.moniker?.toLowerCase()?.includes(searchTerm),
		);
	}

	return validatorsToFilter.sort(VALIDATOR_FILTERS[filter]);
};

const calculateAccumulatedRewards = (validators: VALIDATOR[]) => {
	let total = 0;

	validators.forEach((validator: VALIDATOR) => {
		if (validator.delegation?.rewards?.length) {
			validator.delegation.rewards.forEach((reward) => (total += Number(reward.amount) ?? 0));
		}
	});

	return total / Math.pow(10, 6);
};

const ClaimRewards: FC<ValidatorAddressProps> = ({ onSuccess, onBack, data, header, message }) => {
	const [validatorsData, setValidatorsData] = useState<VALIDATOR[]>([]);
	const [validatorList, setValidatorList] = useState<VALIDATOR[]>([]);
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);
	const [rewards, setRewards] = useState<number>(0);
	const { queryClient, wallet } = useContext(WalletContext);

	const fetchDelegatorDelegations = async () => {
		try {
			const { delegationResponses = [] } = await queryClient.cosmos.staking.v1beta1.delegatorDelegations({
				delegatorAddr: wallet.user?.address ?? '',
			});

			const delegatorDelegations: DELEGATION[] = delegationResponses.map((delegation: any) => ({
				delegatorAddress: delegation.delegation.delegatorAddress,
				validatorAddress: delegation.delegation.validatorAddress,
				shares: Number(delegation.delegation.shares || 0),
				balance: {
					denom: delegation.balance.denom,
					amount: Number(delegation.balance.amount || 0),
				},
			}));

			for (let i = 0; i < delegatorDelegations.length; i++) {
				try {
					const delegation = delegatorDelegations[i];
					const { rewards } = await queryClient.cosmos.distribution.v1beta1.delegationRewards({
						delegatorAddress: wallet.user?.address ?? '',
						validatorAddress: delegation.validatorAddress,
					});

					delegatorDelegations[i].rewards = rewards;
					// const delegatorWithdrawAddress = await queryClient.cosmos.distribution.v1beta1.delegatorWithdrawAddress({
					// 	delegatorAddress: wallet.user?.address ?? '',
					// 	validatorAddress: delegation.validatorAddress,
					// });
				} catch (error) {
					console.error('Failed to query delegation rewards:', error);
				}
			}

			return Promise.resolve(delegatorDelegations);
		} catch (error) {
			console.error(error);
			return Promise.resolve([]);
		}
	};

	const fetchValidators = async () => {
		try {
			if (!queryClient) {
				alert('No query client');
			}

			const { validators = [] } = await queryClient.cosmos.staking.v1beta1.validators({ status: 'BOND_STATUS_BONDED' });
			const delegatorDelegations = await fetchDelegatorDelegations();
			const totalTokens = validators.reduce((result: number, validator: any) => {
				return result + Number(validator.tokens || 0);
			}, 0);

			let newValidatorList = validators.map((validator: any) => {
				const validatorVotingPower = (
					(Number(validator.tokens) / Math.pow(10, 6) / (totalTokens / Math.pow(10, 6))) *
					100
				).toFixed(2);

				const delegation = delegatorDelegations.find(
					(delegation) => delegation.validatorAddress === validator.operatorAddress,
				);

				return {
					address: validator.operatorAddress,
					moniker: validator.description.moniker,
					identity: validator.description.identity,
					avatarUrl: null,
					description: validator.description.details,
					commission: validator.commission.commissionRates.rate / 10000000000000000,
					votingPower: validatorVotingPower,
					votingRank: 0,
					delegation: delegation ?? null,
				};
			});

			newValidatorList = filterValidators(newValidatorList, FILTERS.VOTING_DESC, '');
			newValidatorList = newValidatorList.map((validator: VALIDATOR, index: number) => ({
				...validator,
				votingRank: index + 1,
			}));
			newValidatorList = newValidatorList.filter((validator: VALIDATOR) => !!validator.delegation?.shares);

			console.log({ delegatorDelegations, validators: newValidatorList });

			setValidatorsData(newValidatorList ?? []);
		} catch (error) {
			console.error(error);
		}
	};

	useEffect(() => {
		fetchValidators();
	}, []);

	useEffect(() => {
		if (validatorList?.length) {
			setRewards(calculateAccumulatedRewards(validatorList));
		}
	}, [validatorList]);

	useEffect(() => {
		setValidatorList(filterValidators(validatorsData, FILTERS.VOTING_DESC, ''));
	}, [validatorsData]);

	const formIsValid = () => !!rewards;

	const handleSubmit = (event: FormEvent<HTMLFormElement> | null) => {
		event?.preventDefault();
		if (!formIsValid()) return alert('A validator must be selected');
		onSuccess({ validator: null! });
	};

	const handleAvatarFetched = (validatorIndex: number) => (avatarUrl: string) => {
		setValidatorsData((prevState: VALIDATOR[]) => [
			...prevState.slice(0, validatorIndex),
			{ ...prevState[validatorIndex], avatarUrl },
			...prevState.slice(validatorIndex + 1),
		]);
	};

	const signTX = async (): Promise<void> => {
		setLoading(true);
		// const trx: TRX_MSG = generateWithdrawRewardTrx({
		// 	delegatorAddress: wallet.user!.address,
		// 	validatorAddress:
		// });
		// const hash = await broadCastMessages(wallet, [trx], undefined, defaultTrxFee);
		// if (hash) setSuccess(true);
		setLoading(false);
	};

	return (
		<>
			<Header pageTitle="Claim rewards" header={header} />

			<main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
				{loading || !validatorList.length ? (
					<Loader />
				) : success ? (
					<IconText text="transaction successful!" Img={success} imgSize={50} />
				) : (
					// ) : message === STEPS.distribution_MsgWithdrawDelegatorReward ? (
					<form className={styles.stepsForm} onSubmit={handleSubmit} autoComplete="none">
						<p>Your delegations</p>
						{validatorList.map((validator: any, index: number) => {
							return (
								<ValidatorListItem
									key={validator.address}
									validator={validator}
									onAvatarFetched={handleAvatarFetched(index)}
								/>
							);
						})}
						<div className={utilsStyles.spacer} />
						<p>Combined Rewards:</p>
						<p className={styles.rewardListItem}>{rewards} IXO</p>
						<div className={utilsStyles.spacer} />
						<p>Claim?</p>
					</form>
				)}
				{/* : (
					<p>Unsupported review type</p>
				)} */}
				<Footer
					onBack={loading || success ? null : onBack}
					onBackUrl={onBack ? undefined : ''}
					onCorrect={formIsValid() ? () => handleSubmit(null) : null}
				/>
			</main>
		</>
	);
};

export default ClaimRewards;