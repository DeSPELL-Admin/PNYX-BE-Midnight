import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

class _License_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()))))));
  }
  fromValue(value_0) {
    return {
      buyerPk: _descriptor_0.fromValue(value_0),
      tournamentId: _descriptor_1.fromValue(value_0),
      querySpecHash: _descriptor_0.fromValue(value_0),
      datasetHash: _descriptor_0.fromValue(value_0),
      commitDigest: _descriptor_0.fromValue(value_0),
      rowCount: _descriptor_2.fromValue(value_0),
      sampleAtSale: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.buyerPk).concat(_descriptor_1.toValue(value_0.tournamentId).concat(_descriptor_0.toValue(value_0.querySpecHash).concat(_descriptor_0.toValue(value_0.datasetHash).concat(_descriptor_0.toValue(value_0.commitDigest).concat(_descriptor_2.toValue(value_0.rowCount).concat(_descriptor_2.toValue(value_0.sampleAtSale)))))));
  }
}

const _descriptor_3 = new _License_0();

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_5 = __compactRuntime.CompactTypeBoolean;

const _descriptor_6 = __compactRuntime.CompactTypeField;

class _MerkleTreeDigest_0 {
  alignment() {
    return _descriptor_6.alignment();
  }
  fromValue(value_0) {
    return {
      field: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.field);
  }
}

const _descriptor_7 = new _MerkleTreeDigest_0();

class _VoteRow_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment())));
  }
  fromValue(value_0) {
    return {
      tournamentId: _descriptor_1.fromValue(value_0),
      itemId: _descriptor_1.fromValue(value_0),
      bracketHash: _descriptor_0.fromValue(value_0),
      segment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.tournamentId).concat(_descriptor_1.toValue(value_0.itemId).concat(_descriptor_0.toValue(value_0.bracketHash).concat(_descriptor_0.toValue(value_0.segment))));
  }
}

const _descriptor_8 = new _VoteRow_0();

class _MerkleTreePathEntry_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      sibling: _descriptor_7.fromValue(value_0),
      goes_left: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.sibling).concat(_descriptor_5.toValue(value_0.goes_left));
  }
}

const _descriptor_9 = new _MerkleTreePathEntry_0();

const _descriptor_10 = new __compactRuntime.CompactTypeVector(16, _descriptor_9);

class _MerkleTreePath_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_10.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_0.fromValue(value_0),
      path: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.leaf).concat(_descriptor_10.toValue(value_0.path));
  }
}

const _descriptor_11 = new _MerkleTreePath_0();

class _EscrowRow_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_8.alignment().concat(_descriptor_0.alignment().concat(_descriptor_11.alignment())));
  }
  fromValue(value_0) {
    return {
      present: _descriptor_5.fromValue(value_0),
      row: _descriptor_8.fromValue(value_0),
      salt: _descriptor_0.fromValue(value_0),
      path: _descriptor_11.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.present).concat(_descriptor_8.toValue(value_0.row).concat(_descriptor_0.toValue(value_0.salt).concat(_descriptor_11.toValue(value_0.path))));
  }
}

const _descriptor_12 = new _EscrowRow_0();

const _descriptor_13 = new __compactRuntime.CompactTypeVector(64, _descriptor_1);

const _descriptor_14 = new __compactRuntime.CompactTypeVector(32, _descriptor_1);

const _descriptor_15 = new __compactRuntime.CompactTypeVector(16, _descriptor_1);

const _descriptor_16 = new __compactRuntime.CompactTypeVector(8, _descriptor_12);

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_17 = new _ZswapCoinPublicKey_0();

const _descriptor_18 = new __compactRuntime.CompactTypeVector(8, _descriptor_0);

const _descriptor_19 = new __compactRuntime.CompactTypeBytes(6);

class _LeafPreimage_0 {
  alignment() {
    return _descriptor_19.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_19.fromValue(value_0),
      data: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_19.toValue(value_0.domain_sep).concat(_descriptor_0.toValue(value_0.data));
  }
}

const _descriptor_20 = new _LeafPreimage_0();

const _descriptor_21 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

const _descriptor_22 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_23 = new __compactRuntime.CompactTypeVector(6, _descriptor_0);

const _descriptor_24 = new __compactRuntime.CompactTypeVector(2, _descriptor_6);

class _Either_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_5.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_25 = new _Either_0();

const _descriptor_26 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_27 = new _ContractAddress_0();

const _descriptor_28 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.userSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named userSecret');
    }
    if (typeof(witnesses_0.voteSalt) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named voteSalt');
    }
    if (typeof(witnesses_0.eligibilityPath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named eligibilityPath');
    }
    if (typeof(witnesses_0.escrowRows) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named escrowRows');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      userPublicKey(context, ...args_1) {
        return { result: pureCircuits.userPublicKey(...args_1), context };
      },
      eligibilityLeaf(context, ...args_1) {
        return { result: pureCircuits.eligibilityLeaf(...args_1), context };
      },
      voteNullifier(context, ...args_1) {
        return { result: pureCircuits.voteNullifier(...args_1), context };
      },
      voteCommitment(context, ...args_1) {
        return { result: pureCircuits.voteCommitment(...args_1), context };
      },
      licenseId(context, ...args_1) {
        return { result: pureCircuits.licenseId(...args_1), context };
      },
      grantEligibility: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`grantEligibility: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const leaf_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('grantEligibility',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 158 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('grantEligibility',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 158 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(leaf_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._grantEligibility_0(context,
                                                  partialProofData,
                                                  leaf_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      bracketHash16(context, ...args_1) {
        return { result: pureCircuits.bracketHash16(...args_1), context };
      },
      finalizeTournament16: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`finalizeTournament16: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const _tournamentId_0 = args_1[1];
        const _point_0 = args_1[2];
        const _deadline_0 = args_1[3];
        const _bracket_0 = args_1[4];
        const _segment_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('finalizeTournament16',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 205 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(_tournamentId_0) === 'bigint' && _tournamentId_0 >= 0n && _tournamentId_0 <= 65535n)) {
          __compactRuntime.typeError('finalizeTournament16',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 205 char 1',
                                     'Uint<0..65536>',
                                     _tournamentId_0)
        }
        if (!(typeof(_point_0) === 'bigint' && _point_0 >= 0n && _point_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeTournament16',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 205 char 1',
                                     'Uint<0..18446744073709551616>',
                                     _point_0)
        }
        if (!(typeof(_deadline_0) === 'bigint' && _deadline_0 >= 0n && _deadline_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeTournament16',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 205 char 1',
                                     'Uint<0..18446744073709551616>',
                                     _deadline_0)
        }
        if (!(Array.isArray(_bracket_0) && _bracket_0.length === 16 && _bracket_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 65535n))) {
          __compactRuntime.typeError('finalizeTournament16',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 205 char 1',
                                     'Vector<16, Uint<0..65536>>',
                                     _bracket_0)
        }
        if (!(_segment_0.buffer instanceof ArrayBuffer && _segment_0.BYTES_PER_ELEMENT === 1 && _segment_0.length === 32)) {
          __compactRuntime.typeError('finalizeTournament16',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 205 char 1',
                                     'Bytes<32>',
                                     _segment_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(_tournamentId_0).concat(_descriptor_4.toValue(_point_0).concat(_descriptor_4.toValue(_deadline_0).concat(_descriptor_15.toValue(_bracket_0).concat(_descriptor_0.toValue(_segment_0))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_15.alignment().concat(_descriptor_0.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._finalizeTournament16_0(context,
                                                      partialProofData,
                                                      _tournamentId_0,
                                                      _point_0,
                                                      _deadline_0,
                                                      _bracket_0,
                                                      _segment_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      bracketHash32(context, ...args_1) {
        return { result: pureCircuits.bracketHash32(...args_1), context };
      },
      finalizeTournament32: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`finalizeTournament32: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const _tournamentId_0 = args_1[1];
        const _point_0 = args_1[2];
        const _deadline_0 = args_1[3];
        const _bracket_0 = args_1[4];
        const _segment_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('finalizeTournament32',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 221 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(_tournamentId_0) === 'bigint' && _tournamentId_0 >= 0n && _tournamentId_0 <= 65535n)) {
          __compactRuntime.typeError('finalizeTournament32',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 221 char 1',
                                     'Uint<0..65536>',
                                     _tournamentId_0)
        }
        if (!(typeof(_point_0) === 'bigint' && _point_0 >= 0n && _point_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeTournament32',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 221 char 1',
                                     'Uint<0..18446744073709551616>',
                                     _point_0)
        }
        if (!(typeof(_deadline_0) === 'bigint' && _deadline_0 >= 0n && _deadline_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeTournament32',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 221 char 1',
                                     'Uint<0..18446744073709551616>',
                                     _deadline_0)
        }
        if (!(Array.isArray(_bracket_0) && _bracket_0.length === 32 && _bracket_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 65535n))) {
          __compactRuntime.typeError('finalizeTournament32',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 221 char 1',
                                     'Vector<32, Uint<0..65536>>',
                                     _bracket_0)
        }
        if (!(_segment_0.buffer instanceof ArrayBuffer && _segment_0.BYTES_PER_ELEMENT === 1 && _segment_0.length === 32)) {
          __compactRuntime.typeError('finalizeTournament32',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 221 char 1',
                                     'Bytes<32>',
                                     _segment_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(_tournamentId_0).concat(_descriptor_4.toValue(_point_0).concat(_descriptor_4.toValue(_deadline_0).concat(_descriptor_14.toValue(_bracket_0).concat(_descriptor_0.toValue(_segment_0))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_14.alignment().concat(_descriptor_0.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._finalizeTournament32_0(context,
                                                      partialProofData,
                                                      _tournamentId_0,
                                                      _point_0,
                                                      _deadline_0,
                                                      _bracket_0,
                                                      _segment_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      bracketHash64(context, ...args_1) {
        return { result: pureCircuits.bracketHash64(...args_1), context };
      },
      finalizeTournament64: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`finalizeTournament64: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const _tournamentId_0 = args_1[1];
        const _point_0 = args_1[2];
        const _deadline_0 = args_1[3];
        const _bracket_0 = args_1[4];
        const _segment_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('finalizeTournament64',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 237 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(_tournamentId_0) === 'bigint' && _tournamentId_0 >= 0n && _tournamentId_0 <= 65535n)) {
          __compactRuntime.typeError('finalizeTournament64',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 237 char 1',
                                     'Uint<0..65536>',
                                     _tournamentId_0)
        }
        if (!(typeof(_point_0) === 'bigint' && _point_0 >= 0n && _point_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeTournament64',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 237 char 1',
                                     'Uint<0..18446744073709551616>',
                                     _point_0)
        }
        if (!(typeof(_deadline_0) === 'bigint' && _deadline_0 >= 0n && _deadline_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeTournament64',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 237 char 1',
                                     'Uint<0..18446744073709551616>',
                                     _deadline_0)
        }
        if (!(Array.isArray(_bracket_0) && _bracket_0.length === 64 && _bracket_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 65535n))) {
          __compactRuntime.typeError('finalizeTournament64',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 237 char 1',
                                     'Vector<64, Uint<0..65536>>',
                                     _bracket_0)
        }
        if (!(_segment_0.buffer instanceof ArrayBuffer && _segment_0.BYTES_PER_ELEMENT === 1 && _segment_0.length === 32)) {
          __compactRuntime.typeError('finalizeTournament64',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 237 char 1',
                                     'Bytes<32>',
                                     _segment_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(_tournamentId_0).concat(_descriptor_4.toValue(_point_0).concat(_descriptor_4.toValue(_deadline_0).concat(_descriptor_13.toValue(_bracket_0).concat(_descriptor_0.toValue(_segment_0))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_13.alignment().concat(_descriptor_0.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._finalizeTournament64_0(context,
                                                      partialProofData,
                                                      _tournamentId_0,
                                                      _point_0,
                                                      _deadline_0,
                                                      _bracket_0,
                                                      _segment_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      registerBuyer: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`registerBuyer: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const buyerPk_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerBuyer',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 249 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(buyerPk_0.buffer instanceof ArrayBuffer && buyerPk_0.BYTES_PER_ELEMENT === 1 && buyerPk_0.length === 32)) {
          __compactRuntime.typeError('registerBuyer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 249 char 1',
                                     'Bytes<32>',
                                     buyerPk_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(buyerPk_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._registerBuyer_0(context,
                                               partialProofData,
                                               buyerPk_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      sellRows: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`sellRows: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const buyerPk_0 = args_1[1];
        const tournamentId_0 = args_1[2];
        const specHash_0 = args_1[3];
        const datasetHash_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('sellRows',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 279 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(buyerPk_0.buffer instanceof ArrayBuffer && buyerPk_0.BYTES_PER_ELEMENT === 1 && buyerPk_0.length === 32)) {
          __compactRuntime.typeError('sellRows',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 279 char 1',
                                     'Bytes<32>',
                                     buyerPk_0)
        }
        if (!(typeof(tournamentId_0) === 'bigint' && tournamentId_0 >= 0n && tournamentId_0 <= 65535n)) {
          __compactRuntime.typeError('sellRows',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 279 char 1',
                                     'Uint<0..65536>',
                                     tournamentId_0)
        }
        if (!(specHash_0.buffer instanceof ArrayBuffer && specHash_0.BYTES_PER_ELEMENT === 1 && specHash_0.length === 32)) {
          __compactRuntime.typeError('sellRows',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 279 char 1',
                                     'Bytes<32>',
                                     specHash_0)
        }
        if (!(datasetHash_0.buffer instanceof ArrayBuffer && datasetHash_0.BYTES_PER_ELEMENT === 1 && datasetHash_0.length === 32)) {
          __compactRuntime.typeError('sellRows',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 279 char 1',
                                     'Bytes<32>',
                                     datasetHash_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(buyerPk_0).concat(_descriptor_1.toValue(tournamentId_0).concat(_descriptor_0.toValue(specHash_0).concat(_descriptor_0.toValue(datasetHash_0)))),
            alignment: _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._sellRows_0(context,
                                          partialProofData,
                                          buyerPk_0,
                                          tournamentId_0,
                                          specHash_0,
                                          datasetHash_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setFinalizeSigner: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`setFinalizeSigner: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const _finalizeSigner_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setFinalizeSigner',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 302 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(_finalizeSigner_0.buffer instanceof ArrayBuffer && _finalizeSigner_0.BYTES_PER_ELEMENT === 1 && _finalizeSigner_0.length === 32)) {
          __compactRuntime.typeError('setFinalizeSigner',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 302 char 1',
                                     'Bytes<32>',
                                     _finalizeSigner_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(_finalizeSigner_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setFinalizeSigner_0(context,
                                                   partialProofData,
                                                   _finalizeSigner_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setDomainTag: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`setDomainTag: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const _domainTag_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setDomainTag',
                                     'argument 1 (as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 309 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(_domainTag_0.buffer instanceof ArrayBuffer && _domainTag_0.BYTES_PER_ELEMENT === 1 && _domainTag_0.length === 32)) {
          __compactRuntime.typeError('setDomainTag',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'TournamentFinalizer.compact line 309 char 1',
                                     'Bytes<32>',
                                     _domainTag_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(_domainTag_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setDomainTag_0(context,
                                              partialProofData,
                                              _domainTag_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      grantEligibility: this.circuits.grantEligibility,
      finalizeTournament16: this.circuits.finalizeTournament16,
      finalizeTournament32: this.circuits.finalizeTournament32,
      finalizeTournament64: this.circuits.finalizeTournament64,
      registerBuyer: this.circuits.registerBuyer,
      sellRows: this.circuits.sellRows,
      setFinalizeSigner: this.circuits.setFinalizeSigner,
      setDomainTag: this.circuits.setDomainTag
    };
    this.provableCircuits = {
      grantEligibility: this.circuits.grantEligibility,
      finalizeTournament16: this.circuits.finalizeTournament16,
      finalizeTournament32: this.circuits.finalizeTournament32,
      finalizeTournament64: this.circuits.finalizeTournament64,
      registerBuyer: this.circuits.registerBuyer,
      sellRows: this.circuits.sellRows,
      setFinalizeSigner: this.circuits.setFinalizeSigner,
      setDomainTag: this.circuits.setDomainTag
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const _finalizeSigner_0 = args_0[1];
    const _domainTag_0 = args_0[2];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(_finalizeSigner_0.buffer instanceof ArrayBuffer && _finalizeSigner_0.BYTES_PER_ELEMENT === 1 && _finalizeSigner_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'TournamentFinalizer.compact line 92 char 1',
                                 'Bytes<32>',
                                 _finalizeSigner_0)
    }
    if (!(_domainTag_0.buffer instanceof ArrayBuffer && _domainTag_0.BYTES_PER_ELEMENT === 1 && _domainTag_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'TournamentFinalizer.compact line 92 char 1',
                                 'Bytes<32>',
                                 _domainTag_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('grantEligibility', new __compactRuntime.ContractOperation());
    state_0.setOperation('finalizeTournament16', new __compactRuntime.ContractOperation());
    state_0.setOperation('finalizeTournament32', new __compactRuntime.ContractOperation());
    state_0.setOperation('finalizeTournament64', new __compactRuntime.ContractOperation());
    state_0.setOperation('registerBuyer', new __compactRuntime.ContractOperation());
    state_0.setOperation('sellRows', new __compactRuntime.ContractOperation());
    state_0.setOperation('setFinalizeSigner', new __compactRuntime.ContractOperation());
    state_0.setOperation('setDomainTag', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(0n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(1n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(2n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(3n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                        alignment: _descriptor_4.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(2n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(0n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(4n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(5n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                        alignment: _descriptor_4.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(2n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(0n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(6n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(7n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(8n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(9n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(10n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(11n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.assert(!this._equal_0(_finalizeSigner_0, new Uint8Array(32)),
                            'ZeroAddress');
    const tmp_0 = this._ownPublicKey_0(context, partialProofData).bytes;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(0n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(1n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(_finalizeSigner_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(2n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(_domainTag_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _merkleTreePathRoot_0(path_0) {
    return { field:
               this._folder_0((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_7({ domain_sep:
                                                                                    new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                  data:
                                                                                    path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathEntryRoot_0(recursiveDigest_0, entry_0) {
    const left_0 = entry_0.goes_left ? recursiveDigest_0 : entry_0.sibling.field;
    const right_0 = entry_0.goes_left ?
                    entry_0.sibling.field :
                    recursiveDigest_0;
    return this._transientHash_0([left_0, right_0]);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_24, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_22, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_23, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_21, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_15, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_14, value_0);
    return result_0;
  }
  _persistentHash_5(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_13, value_0);
    return result_0;
  }
  _persistentHash_6(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_18, value_0);
    return result_0;
  }
  _persistentHash_7(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_20, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_8,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_17.toValue(result_0),
      alignment: _descriptor_17.alignment()
    });
    return result_0;
  }
  _userSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.userSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('userSecret',
                                 'return value',
                                 'TournamentFinalizer.compact line 83 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _voteSalt_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.voteSalt(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('voteSalt',
                                 'return value',
                                 'TournamentFinalizer.compact line 84 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _eligibilityPath_0(context, partialProofData, leaf_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.eligibilityPath(witnessContext_0,
                                                                          leaf_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 16 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('eligibilityPath',
                                 'return value',
                                 'TournamentFinalizer.compact line 85 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _escrowRows_0(context, partialProofData, tournamentId_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.escrowRows(witnessContext_0,
                                                                     tournamentId_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 8 && result_0.every((t) => typeof(t) === 'object' && typeof(t.present) === 'boolean' && typeof(t.row) === 'object' && typeof(t.row.tournamentId) === 'bigint' && t.row.tournamentId >= 0n && t.row.tournamentId <= 65535n && typeof(t.row.itemId) === 'bigint' && t.row.itemId >= 0n && t.row.itemId <= 65535n && t.row.bracketHash.buffer instanceof ArrayBuffer && t.row.bracketHash.BYTES_PER_ELEMENT === 1 && t.row.bracketHash.length === 32 && t.row.segment.buffer instanceof ArrayBuffer && t.row.segment.BYTES_PER_ELEMENT === 1 && t.row.segment.length === 32 && t.salt.buffer instanceof ArrayBuffer && t.salt.BYTES_PER_ELEMENT === 1 && t.salt.length === 32 && typeof(t.path) === 'object' && t.path.leaf.buffer instanceof ArrayBuffer && t.path.leaf.BYTES_PER_ELEMENT === 1 && t.path.leaf.length === 32 && Array.isArray(t.path.path) && t.path.path.length === 16 && t.path.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean')))) {
      __compactRuntime.typeError('escrowRows',
                                 'return value',
                                 'TournamentFinalizer.compact line 87 char 1',
                                 'Vector<8, struct EscrowRow<present: Boolean, row: struct VoteRow<tournamentId: Uint<0..65536>, itemId: Uint<0..65536>, bracketHash: Bytes<32>, segment: Bytes<32>>, salt: Bytes<32>, path: struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_16.toValue(result_0),
      alignment: _descriptor_16.alignment()
    });
    return result_0;
  }
  _onlyOwner_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_1(this._ownPublicKey_0(context,
                                                               partialProofData).bytes,
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_28.toValue(0n),
                                                                                                                                alignment: _descriptor_28.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'NotOwner');
    return [];
  }
  _onlySigner_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_2(this._ownPublicKey_0(context,
                                                               partialProofData).bytes,
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_28.toValue(1n),
                                                                                                                                alignment: _descriptor_28.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'NotSigner');
    return [];
  }
  _userPublicKey_0(secret_0) {
    return this._persistentHash_0([new Uint8Array([112, 110, 121, 120, 58, 117, 115, 101, 114, 58, 112, 107, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   secret_0]);
  }
  _eligibilityLeaf_0(tag_0,
                     userPk_0,
                     tournamentId_0,
                     point_0,
                     deadline_0,
                     bHash_0)
  {
    return this._persistentHash_1([tag_0,
                                   userPk_0,
                                   __compactRuntime.convertFieldToBytes(32,
                                                                        tournamentId_0,
                                                                        'TournamentFinalizer.compact line 132 char 9'),
                                   __compactRuntime.convertFieldToBytes(32,
                                                                        point_0,
                                                                        'TournamentFinalizer.compact line 133 char 9'),
                                   __compactRuntime.convertFieldToBytes(32,
                                                                        deadline_0,
                                                                        'TournamentFinalizer.compact line 134 char 9'),
                                   bHash_0]);
  }
  _voteNullifier_0(secret_0, tournamentId_0) {
    return this._persistentHash_2([new Uint8Array([112, 110, 121, 120, 58, 110, 117, 108, 108, 105, 102, 105, 101, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   secret_0,
                                   __compactRuntime.convertFieldToBytes(32,
                                                                        tournamentId_0,
                                                                        'TournamentFinalizer.compact line 141 char 85')]);
  }
  _voteCommitment_0(row_0, salt_0) {
    return this._persistentCommit_0(row_0, salt_0);
  }
  _licenseId_0(buyerPk_0, tournamentId_0, specHash_0) {
    return this._persistentHash_2([buyerPk_0,
                                   __compactRuntime.convertFieldToBytes(32,
                                                                        tournamentId_0,
                                                                        'TournamentFinalizer.compact line 150 char 59'),
                                   specHash_0]);
  }
  _grantEligibility_0(context, partialProofData, leaf_0) {
    this._onlySigner_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(3n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(0n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(1n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(leaf_0),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(1n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(2n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(0n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(7n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_1.toValue(tmp_0),
                                                                alignment: _descriptor_1.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _finalizeCommon_0(context,
                    partialProofData,
                    _tournamentId_0,
                    _point_0,
                    _deadline_0,
                    _champion_0,
                    _bHash_0,
                    _segment_0)
  {
    __compactRuntime.assert(!_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(_deadline_0),
                                                                                                                                               alignment: _descriptor_4.alignment() }).encode() } },
                                                                                        { dup: { n: 3 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_28.toValue(2n),
                                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                                        'lt',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'ExpiredSignature');
    const secret_0 = this._userSecret_0(context, partialProofData);
    const leaf_0 = this._eligibilityLeaf_0(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_28.toValue(2n),
                                                                                                                                 alignment: _descriptor_28.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           this._userPublicKey_0(secret_0),
                                           _tournamentId_0,
                                           _point_0,
                                           _deadline_0,
                                           _bHash_0);
    const path_0 = this._eligibilityPath_0(context, partialProofData, leaf_0);
    __compactRuntime.assert(this._equal_3(path_0.leaf, leaf_0), 'InvalidSigner');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_0(path_0),
                             _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_28.toValue(3n),
                                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_28.toValue(2n),
                                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_7.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'InvalidSigner');
    const nul_0 = this._voteNullifier_0(secret_0, _tournamentId_0);
    __compactRuntime.assert(!_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_28.toValue(4n),
                                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'AlreadyFinalized');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(4n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const row_0 = { tournamentId: _tournamentId_0,
                    itemId: _champion_0,
                    bracketHash: _bHash_0,
                    segment: _segment_0 };
    const tmp_1 = this._voteCommitment_0(row_0,
                                         this._voteSalt_0(context,
                                                          partialProofData));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(5n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(0n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(1n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_1),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(1n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(2n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(0n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (!_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_28.toValue(6n),
                                                                                               alignment: _descriptor_28.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(_tournamentId_0),
                                                                                                                           alignment: _descriptor_1.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_28.toValue(6n),
                                                                    alignment: _descriptor_28.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(_tournamentId_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(6n),
                                                                  alignment: _descriptor_28.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(_tournamentId_0),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_1.toValue(tmp_2),
                                                                alignment: _descriptor_1.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_3 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(8n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_1.toValue(tmp_3),
                                                                alignment: _descriptor_1.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _bracketHash16_0(bracket_0) { return this._persistentHash_3(bracket_0); }
  _finalizeTournament16_0(context,
                          partialProofData,
                          _tournamentId_0,
                          _point_0,
                          _deadline_0,
                          _bracket_0,
                          _segment_0)
  {
    this._finalizeCommon_0(context,
                           partialProofData,
                           _tournamentId_0,
                           _point_0,
                           _deadline_0,
                           _bracket_0[0],
                           this._bracketHash16_0(_bracket_0),
                           _segment_0);
    return [];
  }
  _bracketHash32_0(bracket_0) { return this._persistentHash_4(bracket_0); }
  _finalizeTournament32_0(context,
                          partialProofData,
                          _tournamentId_0,
                          _point_0,
                          _deadline_0,
                          _bracket_0,
                          _segment_0)
  {
    this._finalizeCommon_0(context,
                           partialProofData,
                           _tournamentId_0,
                           _point_0,
                           _deadline_0,
                           _bracket_0[0],
                           this._bracketHash32_0(_bracket_0),
                           _segment_0);
    return [];
  }
  _bracketHash64_0(bracket_0) { return this._persistentHash_5(bracket_0); }
  _finalizeTournament64_0(context,
                          partialProofData,
                          _tournamentId_0,
                          _point_0,
                          _deadline_0,
                          _bracket_0,
                          _segment_0)
  {
    this._finalizeCommon_0(context,
                           partialProofData,
                           _tournamentId_0,
                           _point_0,
                           _deadline_0,
                           _bracket_0[0],
                           this._bracketHash64_0(_bracket_0),
                           _segment_0);
    return [];
  }
  _registerBuyer_0(context, partialProofData, buyerPk_0) {
    this._onlySigner_0(context, partialProofData);
    __compactRuntime.assert(!this._equal_4(buyerPk_0, new Uint8Array(32)),
                            'ZeroAddress');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(9n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(buyerPk_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _requireBuyer_0(context, partialProofData, buyerPk_0) {
    this._onlySigner_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_28.toValue(9n),
                                                                                                                  alignment: _descriptor_28.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(buyerPk_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'BuyerNotRegistered');
    return [];
  }
  _requireFreshLicense_0(context, partialProofData, id_0) {
    __compactRuntime.assert(!_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_28.toValue(10n),
                                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'LicenseExists');
    return [];
  }
  _checkRow_0(context, partialProofData, r_0, tournamentId_0) {
    __compactRuntime.assert(!r_0.present
                            ||
                            this._equal_5(r_0.row.tournamentId, tournamentId_0),
                            'WrongTournament');
    __compactRuntime.assert(!r_0.present
                            ||
                            this._equal_6(r_0.path.leaf,
                                          this._voteCommitment_0(r_0.row,
                                                                 r_0.salt)),
                            'RowNotOnChain');
    let tmp_0;
    const onChain_0 = (tmp_0 = this._merkleTreePathRoot_0(r_0.path),
                       _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_28.toValue(5n),
                                                                                                             alignment: _descriptor_28.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_28.toValue(2n),
                                                                                                             alignment: _descriptor_28.alignment() } }] } },
                                                                                  { push: { storage: false,
                                                                                            value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                                                                         alignment: _descriptor_7.alignment() }).encode() } },
                                                                                  'member',
                                                                                  { popeq: { cached: true,
                                                                                             result: undefined } }]).value));
    __compactRuntime.assert(!r_0.present || onChain_0, 'RowNotOnChain');
    return [];
  }
  _sellRows_0(context,
              partialProofData,
              buyerPk_0,
              tournamentId_0,
              specHash_0,
              datasetHash_0)
  {
    this._requireBuyer_0(context, partialProofData, buyerPk_0);
    const id_0 = this._licenseId_0(buyerPk_0, tournamentId_0, specHash_0);
    this._requireFreshLicense_0(context, partialProofData, id_0);
    const rows_0 = this._escrowRows_0(context, partialProofData, tournamentId_0);
    this._folder_1(context,
                   partialProofData,
                   ((context, partialProofData, t_0, r_0) =>
                    {
                      this._checkRow_0(context,
                                       partialProofData,
                                       r_0,
                                       tournamentId_0);
                      return t_0;
                    }),
                   [],
                   rows_0);
    const n_0 = this._folder_2(context,
                               partialProofData,
                               ((context, partialProofData, acc_0, r_1) =>
                                {
                                  if (r_1.present) {
                                    return ((t1) => {
                                             if (t1 > 4294967295n) {
                                               throw new __compactRuntime.CompactError('TournamentFinalizer.compact line 287 char 75: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                                             }
                                             return t1;
                                           })(acc_0 + 1n);
                                  } else {
                                    return acc_0;
                                  }
                                }),
                               0n,
                               rows_0);
    __compactRuntime.assert(n_0 > 0n, 'EmptyDataset');
    const digest_0 = this._persistentHash_6(this._mapper_0(context,
                                                           partialProofData,
                                                           ((context,
                                                             partialProofData,
                                                             r_2) =>
                                                            {
                                                              return r_2.path.leaf;
                                                            }),
                                                           rows_0));
    const sample_0 = _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_28.toValue(6n),
                                                                                                           alignment: _descriptor_28.alignment() } }] } },
                                                                                { push: { storage: false,
                                                                                          value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tournamentId_0),
                                                                                                                                       alignment: _descriptor_1.alignment() }).encode() } },
                                                                                'member',
                                                                                { popeq: { cached: true,
                                                                                           result: undefined } }]).value)
                     ?
                     _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_28.toValue(6n),
                                                                                                           alignment: _descriptor_28.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_1.toValue(tournamentId_0),
                                                                                                           alignment: _descriptor_1.alignment() } }] } },
                                                                                { popeq: { cached: true,
                                                                                           result: undefined } }]).value)
                     :
                     0n;
    const tmp_0 = { buyerPk: buyerPk_0,
                    tournamentId: tournamentId_0,
                    querySpecHash: specHash_0,
                    datasetHash: datasetHash_0,
                    commitDigest: digest_0,
                    rowCount: n_0,
                    sampleAtSale:
                      ((t1) => {
                        if (t1 > 4294967295n) {
                          throw new __compactRuntime.CompactError('TournamentFinalizer.compact line 294 char 84: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                        }
                        return t1;
                      })(sample_0) };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(10n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_28.toValue(11n),
                                                                  alignment: _descriptor_28.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_1.toValue(tmp_1),
                                                                alignment: _descriptor_1.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _setFinalizeSigner_0(context, partialProofData, _finalizeSigner_0) {
    this._onlyOwner_0(context, partialProofData);
    __compactRuntime.assert(!this._equal_7(_finalizeSigner_0, new Uint8Array(32)),
                            'ZeroAddress');
    __compactRuntime.assert(!this._equal_8(_finalizeSigner_0,
                                           _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_28.toValue(1n),
                                                                                                                                 alignment: _descriptor_28.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'ValueUnchanged');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(1n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(_finalizeSigner_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _setDomainTag_0(context, partialProofData, _domainTag_0) {
    this._onlyOwner_0(context, partialProofData);
    __compactRuntime.assert(!this._equal_9(_domainTag_0,
                                           _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_28.toValue(2n),
                                                                                                                                 alignment: _descriptor_28.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'ValueUnchanged');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(2n),
                                                                                              alignment: _descriptor_28.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(_domainTag_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 16; i++) { x = f(x, a0[i]); }
    return x;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_1(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _folder_2(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _mapper_0(context, partialProofData, f, a0) {
    let a = [];
    for (let i = 0; i < 8; i++) { a[i] = f(context, partialProofData, a0[i]); }
    return a;
  }
  _equal_7(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get owner() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_28.toValue(0n),
                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get finalizeSigner() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_28.toValue(1n),
                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get domainTag() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_28.toValue(2n),
                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    eligibility: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(3n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(1n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(65536n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 59 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(3n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(2n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_7.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 59 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'TournamentFinalizer.compact line 59 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[3];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 59 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[3];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    nullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(4n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(4n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 61 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(4n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[4];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    voteCommits: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(5n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(1n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(65536n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 63 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(5n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(2n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_7.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 63 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'TournamentFinalizer.compact line 63 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[5];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 63 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[5];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    sampleCount: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(6n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(6n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 65535n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 65 char 1',
                                     'Uint<0..65536>',
                                     key_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(6n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(key_0),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 65535n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 65 char 1',
                                     'Uint<0..65536>',
                                     key_0)
        }
        if (state.asArray()[6].asMap().get({ value: _descriptor_1.toValue(key_0),
                                             alignment: _descriptor_1.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          read(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`read: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_28.toValue(6n),
                                                                                                         alignment: _descriptor_28.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_1.toValue(key_0),
                                                                                                         alignment: _descriptor_1.alignment() } }] } },
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          }
        }
      }
    },
    get grantedCount() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_28.toValue(7n),
                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get finalizedCount() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_28.toValue(8n),
                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    buyers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(9n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(9n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 74 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(9n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[9];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    licenses: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(10n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(10n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 76 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(10n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'TournamentFinalizer.compact line 76 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_28.toValue(10n),
                                                                                                     alignment: _descriptor_28.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[10];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get licenseCount() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_28.toValue(11n),
                                                                                                   alignment: _descriptor_28.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  userSecret: (...args) => undefined,
  voteSalt: (...args) => undefined,
  eligibilityPath: (...args) => undefined,
  escrowRows: (...args) => undefined
});
export const pureCircuits = {
  userPublicKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`userPublicKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const secret_0 = args_0[0];
    if (!(secret_0.buffer instanceof ArrayBuffer && secret_0.BYTES_PER_ELEMENT === 1 && secret_0.length === 32)) {
      __compactRuntime.typeError('userPublicKey',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 114 char 1',
                                 'Bytes<32>',
                                 secret_0)
    }
    return _dummyContract._userPublicKey_0(secret_0);
  },
  eligibilityLeaf: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`eligibilityLeaf: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const tag_0 = args_0[0];
    const userPk_0 = args_0[1];
    const tournamentId_0 = args_0[2];
    const point_0 = args_0[3];
    const deadline_0 = args_0[4];
    const bHash_0 = args_0[5];
    if (!(tag_0.buffer instanceof ArrayBuffer && tag_0.BYTES_PER_ELEMENT === 1 && tag_0.length === 32)) {
      __compactRuntime.typeError('eligibilityLeaf',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 121 char 1',
                                 'Bytes<32>',
                                 tag_0)
    }
    if (!(userPk_0.buffer instanceof ArrayBuffer && userPk_0.BYTES_PER_ELEMENT === 1 && userPk_0.length === 32)) {
      __compactRuntime.typeError('eligibilityLeaf',
                                 'argument 2',
                                 'TournamentFinalizer.compact line 121 char 1',
                                 'Bytes<32>',
                                 userPk_0)
    }
    if (!(typeof(tournamentId_0) === 'bigint' && tournamentId_0 >= 0n && tournamentId_0 <= 65535n)) {
      __compactRuntime.typeError('eligibilityLeaf',
                                 'argument 3',
                                 'TournamentFinalizer.compact line 121 char 1',
                                 'Uint<0..65536>',
                                 tournamentId_0)
    }
    if (!(typeof(point_0) === 'bigint' && point_0 >= 0n && point_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('eligibilityLeaf',
                                 'argument 4',
                                 'TournamentFinalizer.compact line 121 char 1',
                                 'Uint<0..18446744073709551616>',
                                 point_0)
    }
    if (!(typeof(deadline_0) === 'bigint' && deadline_0 >= 0n && deadline_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('eligibilityLeaf',
                                 'argument 5',
                                 'TournamentFinalizer.compact line 121 char 1',
                                 'Uint<0..18446744073709551616>',
                                 deadline_0)
    }
    if (!(bHash_0.buffer instanceof ArrayBuffer && bHash_0.BYTES_PER_ELEMENT === 1 && bHash_0.length === 32)) {
      __compactRuntime.typeError('eligibilityLeaf',
                                 'argument 6',
                                 'TournamentFinalizer.compact line 121 char 1',
                                 'Bytes<32>',
                                 bHash_0)
    }
    return _dummyContract._eligibilityLeaf_0(tag_0,
                                             userPk_0,
                                             tournamentId_0,
                                             point_0,
                                             deadline_0,
                                             bHash_0);
  },
  voteNullifier: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`voteNullifier: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const secret_0 = args_0[0];
    const tournamentId_0 = args_0[1];
    if (!(secret_0.buffer instanceof ArrayBuffer && secret_0.BYTES_PER_ELEMENT === 1 && secret_0.length === 32)) {
      __compactRuntime.typeError('voteNullifier',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 140 char 1',
                                 'Bytes<32>',
                                 secret_0)
    }
    if (!(typeof(tournamentId_0) === 'bigint' && tournamentId_0 >= 0n && tournamentId_0 <= 65535n)) {
      __compactRuntime.typeError('voteNullifier',
                                 'argument 2',
                                 'TournamentFinalizer.compact line 140 char 1',
                                 'Uint<0..65536>',
                                 tournamentId_0)
    }
    return _dummyContract._voteNullifier_0(secret_0, tournamentId_0);
  },
  voteCommitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`voteCommitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const row_0 = args_0[0];
    const salt_0 = args_0[1];
    if (!(typeof(row_0) === 'object' && typeof(row_0.tournamentId) === 'bigint' && row_0.tournamentId >= 0n && row_0.tournamentId <= 65535n && typeof(row_0.itemId) === 'bigint' && row_0.itemId >= 0n && row_0.itemId <= 65535n && row_0.bracketHash.buffer instanceof ArrayBuffer && row_0.bracketHash.BYTES_PER_ELEMENT === 1 && row_0.bracketHash.length === 32 && row_0.segment.buffer instanceof ArrayBuffer && row_0.segment.BYTES_PER_ELEMENT === 1 && row_0.segment.length === 32)) {
      __compactRuntime.typeError('voteCommitment',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 145 char 1',
                                 'struct VoteRow<tournamentId: Uint<0..65536>, itemId: Uint<0..65536>, bracketHash: Bytes<32>, segment: Bytes<32>>',
                                 row_0)
    }
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('voteCommitment',
                                 'argument 2',
                                 'TournamentFinalizer.compact line 145 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._voteCommitment_0(row_0, salt_0);
  },
  licenseId: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`licenseId: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const buyerPk_0 = args_0[0];
    const tournamentId_0 = args_0[1];
    const specHash_0 = args_0[2];
    if (!(buyerPk_0.buffer instanceof ArrayBuffer && buyerPk_0.BYTES_PER_ELEMENT === 1 && buyerPk_0.length === 32)) {
      __compactRuntime.typeError('licenseId',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 149 char 1',
                                 'Bytes<32>',
                                 buyerPk_0)
    }
    if (!(typeof(tournamentId_0) === 'bigint' && tournamentId_0 >= 0n && tournamentId_0 <= 65535n)) {
      __compactRuntime.typeError('licenseId',
                                 'argument 2',
                                 'TournamentFinalizer.compact line 149 char 1',
                                 'Uint<0..65536>',
                                 tournamentId_0)
    }
    if (!(specHash_0.buffer instanceof ArrayBuffer && specHash_0.BYTES_PER_ELEMENT === 1 && specHash_0.length === 32)) {
      __compactRuntime.typeError('licenseId',
                                 'argument 3',
                                 'TournamentFinalizer.compact line 149 char 1',
                                 'Bytes<32>',
                                 specHash_0)
    }
    return _dummyContract._licenseId_0(buyerPk_0, tournamentId_0, specHash_0);
  },
  bracketHash16: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`bracketHash16: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const bracket_0 = args_0[0];
    if (!(Array.isArray(bracket_0) && bracket_0.length === 16 && bracket_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 65535n))) {
      __compactRuntime.typeError('bracketHash16',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 200 char 1',
                                 'Vector<16, Uint<0..65536>>',
                                 bracket_0)
    }
    return _dummyContract._bracketHash16_0(bracket_0);
  },
  bracketHash32: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`bracketHash32: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const bracket_0 = args_0[0];
    if (!(Array.isArray(bracket_0) && bracket_0.length === 32 && bracket_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 65535n))) {
      __compactRuntime.typeError('bracketHash32',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 216 char 1',
                                 'Vector<32, Uint<0..65536>>',
                                 bracket_0)
    }
    return _dummyContract._bracketHash32_0(bracket_0);
  },
  bracketHash64: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`bracketHash64: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const bracket_0 = args_0[0];
    if (!(Array.isArray(bracket_0) && bracket_0.length === 64 && bracket_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 65535n))) {
      __compactRuntime.typeError('bracketHash64',
                                 'argument 1',
                                 'TournamentFinalizer.compact line 232 char 1',
                                 'Vector<64, Uint<0..65536>>',
                                 bracket_0)
    }
    return _dummyContract._bracketHash64_0(bracket_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
