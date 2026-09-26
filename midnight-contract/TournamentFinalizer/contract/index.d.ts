import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type VoteRow = { tournamentId: bigint;
                        itemId: bigint;
                        bracketHash: Uint8Array;
                        segment: Uint8Array
                      };

export type EscrowRow = { present: boolean;
                          row: VoteRow;
                          salt: Uint8Array;
                          path: { leaf: Uint8Array,
                                  path: { sibling: { field: bigint },
                                          goes_left: boolean
                                        }[]
                                }
                        };

export type License = { buyerPk: Uint8Array;
                        tournamentId: bigint;
                        querySpecHash: Uint8Array;
                        datasetHash: Uint8Array;
                        commitDigest: Uint8Array;
                        rowCount: bigint;
                        sampleAtSale: bigint
                      };

export type Witnesses<PS> = {
  userSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  voteSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  eligibilityPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
                  leaf_0: Uint8Array): [PS, { leaf: Uint8Array,
                                              path: { sibling: { field: bigint },
                                                      goes_left: boolean
                                                    }[]
                                            }];
  escrowRows(context: __compactRuntime.WitnessContext<Ledger, PS>,
             tournamentId_0: bigint): [PS, EscrowRow[]];
}

export type ImpureCircuits<PS> = {
  grantEligibility(context: __compactRuntime.CircuitContext<PS>,
                   leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalizeTournament16(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalizeTournament32(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalizeTournament64(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerBuyer(context: __compactRuntime.CircuitContext<PS>,
                buyerPk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  sellRows(context: __compactRuntime.CircuitContext<PS>,
           buyerPk_0: Uint8Array,
           tournamentId_0: bigint,
           specHash_0: Uint8Array,
           datasetHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  setFinalizeSigner(context: __compactRuntime.CircuitContext<PS>,
                    _finalizeSigner_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  setDomainTag(context: __compactRuntime.CircuitContext<PS>,
               _domainTag_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  grantEligibility(context: __compactRuntime.CircuitContext<PS>,
                   leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalizeTournament16(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalizeTournament32(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalizeTournament64(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerBuyer(context: __compactRuntime.CircuitContext<PS>,
                buyerPk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  sellRows(context: __compactRuntime.CircuitContext<PS>,
           buyerPk_0: Uint8Array,
           tournamentId_0: bigint,
           specHash_0: Uint8Array,
           datasetHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  setFinalizeSigner(context: __compactRuntime.CircuitContext<PS>,
                    _finalizeSigner_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  setDomainTag(context: __compactRuntime.CircuitContext<PS>,
               _domainTag_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  userPublicKey(secret_0: Uint8Array): Uint8Array;
  eligibilityLeaf(tag_0: Uint8Array,
                  userPk_0: Uint8Array,
                  tournamentId_0: bigint,
                  point_0: bigint,
                  deadline_0: bigint,
                  bHash_0: Uint8Array): Uint8Array;
  voteNullifier(secret_0: Uint8Array, tournamentId_0: bigint): Uint8Array;
  voteCommitment(row_0: VoteRow, salt_0: Uint8Array): Uint8Array;
  licenseId(buyerPk_0: Uint8Array,
            tournamentId_0: bigint,
            specHash_0: Uint8Array): Uint8Array;
  bracketHash16(bracket_0: bigint[]): Uint8Array;
  bracketHash32(bracket_0: bigint[]): Uint8Array;
  bracketHash64(bracket_0: bigint[]): Uint8Array;
}

export type Circuits<PS> = {
  userPublicKey(context: __compactRuntime.CircuitContext<PS>,
                secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  eligibilityLeaf(context: __compactRuntime.CircuitContext<PS>,
                  tag_0: Uint8Array,
                  userPk_0: Uint8Array,
                  tournamentId_0: bigint,
                  point_0: bigint,
                  deadline_0: bigint,
                  bHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  voteNullifier(context: __compactRuntime.CircuitContext<PS>,
                secret_0: Uint8Array,
                tournamentId_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  voteCommitment(context: __compactRuntime.CircuitContext<PS>,
                 row_0: VoteRow,
                 salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  licenseId(context: __compactRuntime.CircuitContext<PS>,
            buyerPk_0: Uint8Array,
            tournamentId_0: bigint,
            specHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  grantEligibility(context: __compactRuntime.CircuitContext<PS>,
                   leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  bracketHash16(context: __compactRuntime.CircuitContext<PS>,
                bracket_0: bigint[]): __compactRuntime.CircuitResults<PS, Uint8Array>;
  finalizeTournament16(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  bracketHash32(context: __compactRuntime.CircuitContext<PS>,
                bracket_0: bigint[]): __compactRuntime.CircuitResults<PS, Uint8Array>;
  finalizeTournament32(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  bracketHash64(context: __compactRuntime.CircuitContext<PS>,
                bracket_0: bigint[]): __compactRuntime.CircuitResults<PS, Uint8Array>;
  finalizeTournament64(context: __compactRuntime.CircuitContext<PS>,
                       _tournamentId_0: bigint,
                       _point_0: bigint,
                       _deadline_0: bigint,
                       _bracket_0: bigint[],
                       _segment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerBuyer(context: __compactRuntime.CircuitContext<PS>,
                buyerPk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  sellRows(context: __compactRuntime.CircuitContext<PS>,
           buyerPk_0: Uint8Array,
           tournamentId_0: bigint,
           specHash_0: Uint8Array,
           datasetHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  setFinalizeSigner(context: __compactRuntime.CircuitContext<PS>,
                    _finalizeSigner_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  setDomainTag(context: __compactRuntime.CircuitContext<PS>,
               _domainTag_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly owner: Uint8Array;
  readonly finalizeSigner: Uint8Array;
  readonly domainTag: Uint8Array;
  eligibility: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  voteCommits: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  sampleCount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { read(): bigint }
  };
  readonly grantedCount: bigint;
  readonly finalizedCount: bigint;
  buyers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  licenses: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): License;
    [Symbol.iterator](): Iterator<[Uint8Array, License]>
  };
  readonly licenseCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               _finalizeSigner_0: Uint8Array,
               _domainTag_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
