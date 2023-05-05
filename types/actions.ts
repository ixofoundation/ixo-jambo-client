import { STEP } from './steps';

export type ACTION = {
  id: string;
  name: string;
  description: string;
  steps: STEP[];
  image: string;
};

export type VOTE = {
  proposalId: string;
  voteOption: string;
};

