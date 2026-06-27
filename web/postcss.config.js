import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

const stripUnsupportedCefEffects = {
    postcssPlugin: 'strip-unsupported-cef-effects',
    Declaration(declaration) {
        const property = declaration.prop.toLowerCase()
        const value = declaration.value.toLowerCase()

        const isBackdropEffect = property.includes('backdrop-filter') || property.startsWith('--tw-backdrop-')
        const isBlurVariable = property === '--tw-blur' && value.includes('blur(')
        const isDirectBlur = property === 'filter' && value.includes('blur(')

        if (isBackdropEffect || isBlurVariable || isDirectBlur) {
            declaration.remove()
        }
    },
    AtRule(atRule) {
        if (atRule.name === 'property' && /--tw-(?:backdrop-)?blur/.test(atRule.params)) {
            atRule.remove()
        }
    },
    RuleExit(rule) {
        if (!rule.nodes?.length) rule.remove()
    },
}

export default {
    plugins: [tailwindcss(), autoprefixer(), stripUnsupportedCefEffects],
}
