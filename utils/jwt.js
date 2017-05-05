import jwt from 'jwt-simple';

export function getJwt(user, secret){
  const now = Date.now();
  const nextWeek = now + 7*24*60*60;
  const claims = {
    sub: user.id,
    iat: now,
    exp: nextWeek
  };
  let token = jwt.encode(claims, secret);
  return token;
}
