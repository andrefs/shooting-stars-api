import bases from 'bases';

export default () => {
  const ts = new Date().getTime() % 1000000;
  return bases.toBase36(ts).toUpperCase();
};


