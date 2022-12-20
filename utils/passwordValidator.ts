export default function(password: String) {
  //let re = /^([\w]|[\.@$!%*#?&]|).{6,50}$/
  let reChar = /^([\w]|[\.@$!%*#?&]|).$/
  
  if (!password.search(reChar)) {
    return "contain other character than alphanumeric or .@$!%*#?&"
  } else if (password.length<=6) {
    return "password too short"
  } else {
    return "ok"
  }
}