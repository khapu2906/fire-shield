import DefaultTheme from 'vitepress/theme'
import BuyMeACoffee from './components/BuyMeACoffee.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register custom components globally
    app.component('BuyMeACoffee', BuyMeACoffee)
  }
}
