'use strict';
import bases from 'bases';

module.exports = () => {
  const ts = new Date().getTime() % 1000000;
  return bases.toBase36(ts).toUpperCase();
}






