import { FC, useEffect, useRef, useState } from 'react';
import cls from 'classnames';
import Header from 'next/head';

import { STEPS, StepConfigType, StepDataType } from 'types/steps';
import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import HeaderNav from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import Loader from '@components/Loader/Loader';

type ComplyCubeProps = {
  onSuccess: (data: StepDataType<STEPS.select_token_and_amount>) => void;
  onBack?: () => void;
  config?: StepConfigType<STEPS.comply_cube>;
  data?: StepDataType<STEPS.comply_cube>;
  header?: string;
};

const ComplyCube: FC<ComplyCubeProps> = ({ onSuccess, onBack, header }) => {
  const complyCubeRef = useRef<any>(null);
  const [ccLoaded, setCcLoaded] = useState(false);

  function handleMountComplyCube() {
    complyCubeRef.current = window?.ComplyCube?.mount({
      token: '<YOUR_WEB_SDK_TOKEN>',
      containerId: 'complycube-mount',
      stages: [
        'intro',
        'documentCapture',
        {
          name: 'faceCapture',
          options: {
            mode: 'video',
          },
        },
        'completion',
      ],
      onComplete: function (data) {
        // Using the data attributes returned, request your
        // backend server to perform the necessary ComplyCube checks
        console.info('Capture complete');
        console.log({ data });
      },
      onModalClose: function () {
        console.log('Modal closed');
        // Handle the modal closure attempt
        complyCubeRef.current.updateSettings({ isModalOpen: false });
        complyCubeRef.current.unmount();
      },
      onError: function ({ type, message }) {
        console.error(message);
        if (type === 'token_expired') {
          // Request a new SDK token
        } else {
          // Handle other errors
          console.error(message);
        }
      },
    });
  }

  useEffect(() => {
    // add timeout to check every 300ms if ComplyCube is loaded
    const interval = setInterval(() => {
      console.log('interval');
      if (window && window.ComplyCube) {
        console.log('ComplyCube is loaded');
        setCcLoaded(true);
        handleMountComplyCube();
        clearInterval(interval);
      }
    }, 300);
    return () => {
      clearInterval(interval);
      if (complyCubeRef?.current) {
        complyCubeRef.current.unmount();
      }
    };
  }, []);

  return (
    <>
      <Header>
        {/* needed for ComplyCube */}
        <meta name='referrer' content='strict-origin-when-cross-origin' />
        {/* Importing the Javascript librar */}
        <script src='https://assets.complycube.com/web-sdk/v1/complycube.min.js' defer></script>
        {/* Importing the default CSS  */}
        <link rel='stylesheet' href='https://assets.complycube.com/web-sdk/v1/style.css' />
      </Header>

      <HeaderNav header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {!ccLoaded ? (
          <Loader />
        ) : (
          <>
            <div className={styles.stepTitle}>Comply Cube KYC Documentation</div>
            <Button
              rounded
              label='ComplyCube Start'
              textCentered
              className={styles.button}
              color={BUTTON_COLOR.white}
              size={BUTTON_SIZE.mediumLarge}
              bgColor={BUTTON_BG_COLOR.primary}
              onClick={handleMountComplyCube}
            />
          </>
        )}
      </main>

      <Footer onBack={onBack} />
    </>
  );
};

export default ComplyCube;
