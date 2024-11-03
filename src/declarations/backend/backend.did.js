export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'addScore' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        [],
      ),
    'getHighScores' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
