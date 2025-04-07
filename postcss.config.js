export default {

  plugins: {
    'postcss-pxtorem': {
      rootValue: 16,
      propList: ['*'],
        exclide:'node_modules/i',
        // MediaQuery:true
    }
  }
}