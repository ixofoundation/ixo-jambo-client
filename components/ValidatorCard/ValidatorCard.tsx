import { FC } from 'react';
import Image from 'next/image';

import utilsStyles from '@styles/utils.module.scss';
import styles from './ValidatorCard.module.scss';
import Card, { CARD_BG_COLOR, CARD_COLOR, CARD_SIZE } from '@components/Card/Card';
import { CURRENCY_TOKEN } from 'types/wallet';
import { VALIDATOR } from 'types/validators';
import {
	formatTokenAmount,
	getAmountFromCurrencyToken,
	getDecimalsFromCurrencyToken,
	getDisplayDenomFromCurrencyToken,
} from '@utils/currency';

type ValidatorCardProps = {
	validator: VALIDATOR;
};

const ValidatorCard: FC<ValidatorCardProps> = ({ validator }) => {
	const delegated = !!validator.delegation?.balance;
	const delegationAmount = delegated ? getAmountFromCurrencyToken(validator.delegation?.balance as CURRENCY_TOKEN) : 0;
	const delegationDenom = delegated
		? getDisplayDenomFromCurrencyToken(validator.delegation?.balance as CURRENCY_TOKEN)
		: '';
	const delegationDecimals = delegated
		? getDecimalsFromCurrencyToken(validator.delegation?.balance as CURRENCY_TOKEN)
		: 0;

	return (
		<>
			<Card className={styles.validatorCard}>
				<div className={styles.headerRow}>
					<span className={styles.validatorAvatar}>
						{!!validator.avatarUrl && (
							<Image src={validator.avatarUrl} alt={`${validator.moniker} avatar`} layout="fill" objectFit="contain" />
						)}
					</span>
					<div className={styles.validatorHeader}>{validator.moniker}</div>
				</div>
				<div className={styles.detailRow}>
					<p>Voting Power</p>
					<p>{validator.votingPower}%</p>
				</div>
				<div className={styles.detailRow}>
					<p>Commission</p>
					<p>{validator.commission}%</p>
				</div>
				<div>{validator.description}</div>
			</Card>
			{!!delegated && (
				<>
					<div className={utilsStyles.spacer3} />
					<Card
						rounded
						className={styles.stakeCard}
						bgColor={CARD_BG_COLOR.primary}
						color={CARD_COLOR.inverted}
						size={CARD_SIZE.mediumLarge}
					>
						<span>My stake:</span>
						<span>
							{formatTokenAmount(delegationAmount, delegationDecimals)} {delegationDenom}
						</span>
					</Card>
				</>
			)}
		</>
	);
};

export default ValidatorCard;
