import { useState, useEffect, useContext } from 'react';
import type { GetStaticPaths, NextPage, GetStaticPropsResult, GetStaticPropsContext } from 'next';

import Head from '@components/Head/Head';
import { StepDataType, STEP, STEPS } from 'types/steps';
import DefineSwapAmountToken from '@steps/SwapTokens';
import DefineAmountDelegate from '@steps/DefineAmountDelegate';
import DefineAmountToken from '@steps/DefineAmountToken';
import ValidatorAddress from '@steps/ValidatorAddress';
import ReceiverAddress from '@steps/ReceiverAddress';
import ValidatorRewards from '@steps/ClaimRewards';
import ReviewAndSign from '@steps/ReviewAndSign';
import EmptySteps from '@steps/EmptySteps';
import { VALIDATOR_AMOUNT_CONFIGS, VALIDATOR_CONFIGS } from '@constants/validatorConfigs';
import config from '@constants/config.json';
import { VALIDATOR_AMOUNT_CONFIG } from 'types/validators';
import { ACTION } from 'types/actions';
import { backRoute, replaceRoute } from '@utils/router';
import { WalletContext } from '@contexts/wallet';
import SwapTokens from '@steps/SwapTokens';

type ActionPageProps = {
  actionData: ACTION;
};

const ActionExecution: NextPage<ActionPageProps> = ({ actionData }) => {
  const [count, setCount] = useState(0);
  const [action, setAction] = useState<ACTION | null>(null);
  const { wallet } = useContext(WalletContext);
  const signedIn = wallet.user?.address;

  useEffect(() => {
    setAction(actionData);
  }, [actionData]);

  function handleOnNext<T>(data: StepDataType<T>) {
    setAction((a) =>
      !a ? a : { ...a, steps: a.steps.map((step, index) => (index === count ? { ...step, data } : step)) },
    );
    if (count + 1 === action?.steps.length) return replaceRoute('/');
    setCount((c) => c + 1);
  }

  const handleBack = () => {
    if (count === 0) {
      const newActionData = JSON.parse(JSON.stringify(action));
      if (newActionData.steps.find((step: STEP) => step.id === STEPS.get_receiver_address)?.data?.data?.length > 1) {
        newActionData.steps.forEach((step: STEP, index: number) => {
          if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address) {
            newActionData.steps[index].data.data.pop();
            newActionData.steps[index].data.currentIndex = newActionData.steps[index].data.data.length - 1;
          }
        });
        setAction(newActionData);
        return setCount(action?.steps.findIndex((step) => step.id === STEPS.bank_MsgMultiSend) as number);
      } else {
        return backRoute();
      }
    }
    setCount((c) => c - 1);
  };

  const handleNextMultiSend = (nextIndex: number = 0) => {
    const newActionData = JSON.parse(JSON.stringify(action));
    action!.steps!.forEach((step, index) => {
      if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address)
        newActionData.steps[index].data.currentIndex = nextIndex;
    });
    setAction(newActionData);
    setCount((c) => c - 2);
  };

  const handleDeleteMultiSend = (deleteIndex: number = 0) => {
    const newActionData = JSON.parse(JSON.stringify(action));
    if (
      newActionData.steps.find(
        (step: STEP) => step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address,
      )?.data?.data.length <= 1
    )
      return replaceRoute('/');
    newActionData.steps.forEach((step: STEP, index: number) => {
      if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address) {
        newActionData.steps[index].data.data = [
          ...newActionData.steps[index].data.data.slice(0, deleteIndex),
          ...newActionData.steps[index].data.data.slice(deleteIndex + 1),
        ];
        newActionData.steps[index].data.currentIndex = newActionData.steps[index].data.data.length - 1;
      }
    });
    setAction(newActionData);
  };

  const getStepComponent = (step: STEP) => {
    switch (step?.id) {
      case STEPS.get_receiver_address:
        return (
          <ReceiverAddress
            onSuccess={handleOnNext<STEPS.get_receiver_address>}
            onBack={handleBack}
            data={
              (step.data as StepDataType<STEPS.get_receiver_address>) ?? {
                data: [],
                currentIndex: 0,
              }
            }
            header={action?.name}
          />
        );
      case STEPS.get_validator_delegate:
      case STEPS.get_delegated_validator_undelegate:
      case STEPS.get_delegated_validator_redelegate:
      case STEPS.get_validator_redelegate:
        return (
          <ValidatorAddress
            onSuccess={handleOnNext<STEPS.get_validator_delegate>}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.get_validator_delegate>}
            header={action?.name}
            config={VALIDATOR_CONFIGS[step.id] ?? VALIDATOR_CONFIGS.default}
            excludeValidators={
              step.id === STEPS.get_validator_redelegate
                ? (
                    action?.steps.find((step) => step.id === STEPS.get_delegated_validator_redelegate)
                      ?.data as StepDataType<STEPS.get_validator_delegate>
                  )?.validator?.address || []
                : []
            }
          />
        );
      case STEPS.select_token_and_amount:
        return (
          <DefineAmountToken
            onSuccess={handleOnNext<STEPS.select_token_and_amount>}
            onBack={handleBack}
            data={
              (step.data as StepDataType<STEPS.select_token_and_amount>) ?? {
                data: [],
                currentIndex: 0,
              }
            }
            header={action?.name}
          />
        );
      case STEPS.select_amount_delegate:
      case STEPS.select_amount_undelegate:
      case STEPS.select_amount_redelegate:
        return (
          <DefineAmountDelegate
            onSuccess={handleOnNext<STEPS.select_amount_delegate>}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.select_amount_delegate>}
            header={action?.name}
            config={(VALIDATOR_AMOUNT_CONFIGS[step.id] ?? VALIDATOR_AMOUNT_CONFIGS.default) as VALIDATOR_AMOUNT_CONFIG}
            validator={
              (
                action?.steps.find(
                  (step) =>
                    step.id === STEPS.get_validator_delegate ||
                    step.id === STEPS.get_delegated_validator_undelegate ||
                    step.id === STEPS.get_delegated_validator_redelegate,
                )?.data as StepDataType<STEPS.get_validator_delegate>
              )?.validator || null
            }
          />
        );
      case STEPS.distribution_MsgWithdrawDelegatorReward:
        return (
          <ValidatorRewards
            onSuccess={handleOnNext<STEPS.review_and_sign>}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.get_validator_delegate>}
            header={action?.name}
            message={step.id}
          />
        );
      case STEPS.wasm_MsgSwap:
        return (
          <SwapTokens
            onSuccess={handleOnNext<STEPS.review_and_sign>}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.review_and_sign>}
            header={action?.name}
            message={step.id}
          />
        );
      case STEPS.bank_MsgSend:
      case STEPS.bank_MsgMultiSend:
      case STEPS.staking_MsgDelegate:
      case STEPS.staking_MsgUndelegate:
      case STEPS.staking_MsgRedelegate:
        return (
          <ReviewAndSign
            onSuccess={handleOnNext<STEPS.review_and_sign>}
            handleNextMultiSend={handleNextMultiSend}
            deleteMultiSend={handleDeleteMultiSend}
            onBack={handleBack}
            steps={action!.steps}
            header={action?.name}
            message={step.id}
          />
        );
      default:
        return <EmptySteps loading={true} />;
    }
  };

  return (
    <>
      <Head title={actionData.name} description={actionData.description} />

      {!signedIn ? (
        <EmptySteps signedIn={false} />
      ) : (action?.steps?.length ?? 0) < 1 ? (
        <EmptySteps />
      ) : (
        getStepComponent(action!.steps[count])
      )}
    </>
  );
};

export default ActionExecution;

type PathsParams = {
  actionId: string;
};

export const getStaticPaths: GetStaticPaths<PathsParams> = async () => {
  const paths = config.actions.map((a) => ({ params: { actionId: a.id } }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps = async ({
  params,
}: GetStaticPropsContext<PathsParams>): Promise<GetStaticPropsResult<ActionPageProps>> => {
  const actionData = config.actions.find((a) => params!.actionId == a.id);

  return {
    props: {
      actionData: actionData as ACTION,
    },
  };
};
