import { freighterService } from './freighter.service';

export const sorobanTransactionService = {
  sign: (xdr: string, address?: string) => freighterService.signSorobanTransaction(xdr, address),
};
