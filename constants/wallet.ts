import { WALLET_TYPE } from 'types/wallet';

export const WALLETS = {
  [WALLET_TYPE.keplr]: {
    name: 'Keplr Wallet',
    img: '/images/wallets/keplr.png',
    type: WALLET_TYPE.keplr,
  },
  [WALLET_TYPE.opera]: {
    name: 'Opera Wallet',
    img: '/images/wallets/opera.png',
    type: WALLET_TYPE.opera,
  },
  [WALLET_TYPE.walletConnect]: {
    name: 'WalletConnect',
    img: '/images/wallets/wallet-connect.png',
    type: WALLET_TYPE.walletConnect,
  },
  [WALLET_TYPE.signX]: {
    name: 'SignX',
    img: '/images/wallets/signX.png',
    type: WALLET_TYPE.signX,
  },
  [WALLET_TYPE.impactsX]: {
    name: 'ImpactsX',
    img: '/images/wallets/impacts-x.png',
    type: WALLET_TYPE.impactsX,
  },
};

export const WalletConnectProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
