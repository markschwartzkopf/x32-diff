interface oscObject {
  /* config?: configObj; */

  [deleteme: string]: deletMe | any;
}

/* interface configObj {} */

interface deletMe {
  [deleteme: string]: deletMe | any;
}

interface diffObject {
  [key: string]: diffLeaf | diffObject | boolean;
}

interface diffLeaf {
  reference: string;
  current: string;
  shown?: boolean;
}

interface apiObject {
  type: string;
  data: any;
}

interface apiCommand {
  command: string;
  data?: any;
}

type checker = (msg: oscMessage, index: number) => void;

type oscMessage = { command: string; address: string; values: string[] };

type oscType =
  | oscEnum
  | oscLinf
  | oscInt
  | oscBitmap
  | 'level'
  | 'level161'
  | 'oscFreq'
  | 'freq'
  | 'q'
  | 'hpf'
  | 'hold'
  | 'release'
  | 'string'
  | 'fxParam';

type oscEnum = string[];

type oscLinf = [number, number, number];

type oscInt = ['int', number];

type oscBitmap = ['bitmap', number];

type oscKeyArray = { type: oscType; name: string }[];
