import React, { useState } from 'react'
import Charcoal from '@icons/charcoal.svg';
import styles from './SupaMotoScreens.module.scss';
import IconText from '@components/IconText/IconText';

const MonthlyCharcoalEx = () => {
    const [amount, setAmount] = useState(0);

    const handleAmountChange = (event: { target: { value: React.SetStateAction<number>; }; }) => {
        setAmount(event.target.value);
    };

    return (
        <div>
            <IconText title='Monthly Charcoal Expenses' Img={Charcoal} imgSize={30} />
            <label>{amount}</label>
            <div>
                <input
                    className={styles.monthlyIncome}
                    type="range"
                    id="amount"
                    name="amount"
                    min="0"
                    max="10000"
                    step="1"
                    value={amount}
                    onChange={handleAmountChange}
                />
            </div>
        </div>
    )
}

export default MonthlyCharcoalEx;
