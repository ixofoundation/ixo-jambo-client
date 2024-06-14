import { FC } from 'react';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepConfigType, StepDataType, STEPS } from 'types/steps';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import { signXDataPass } from '@utils/signX';
import * as Toast from '@components/Toast/Toast';

type SignXDataProps = {
  onSuccess: (data: StepDataType<STEPS.define_proposal_title>) => void;
  onBack?: () => void;
  config?: StepConfigType<STEPS.sign_x_data>;
  data?: StepDataType<STEPS.sign_x_data>;
  header?: string;
};

const SignXData: FC<SignXDataProps> = ({ onSuccess, onBack, data, header }) => {
  const jsonData = {
    test: 'test',
    haha: 'haha',
  };
  const type = 'kyc';

  const handleSubmit = async () => {
    const res = await signXDataPass(jsonData, type);
    res && Toast.successToast(res.response);
  };

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <h2>Sign X Data Pass</h2>
        <h4>JSON Data:</h4>
        <p>{JSON.stringify(jsonData, null, 2)}</p>
        <h4>Data type:</h4>
        <pre>{type}</pre>
        <br />

        <Button
          rounded
          label='Send SignX Data'
          textCentered={false}
          className={styles.button}
          color={BUTTON_COLOR.white}
          size={BUTTON_SIZE.mediumLarge}
          bgColor={BUTTON_BG_COLOR.primary}
          onClick={handleSubmit}
        />
      </main>

      <Footer onBack={onBack} />
    </>
  );
};

export default SignXData;
