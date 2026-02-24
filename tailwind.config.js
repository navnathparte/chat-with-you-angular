module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(80px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-80px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.9s ease forwards',
        fadeInDown: 'fadeInDown 0.9s ease forwards',
      },
    },
  },
  plugins: [],
};
