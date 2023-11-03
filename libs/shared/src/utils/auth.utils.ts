function checkIsAdmin(baseLocale, req) {
  return (
    req.get('Authorization') === `Token ${baseLocale.token}` ||
    req.get('Authorization') === `Token ${process.env.ADMIN_TOKEN}`
  );
}
