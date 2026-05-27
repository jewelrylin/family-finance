exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Netlify Functions 正常工作' })
  };
};
