/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./static/**/*.{html,js}", 
    "./templates/**/*.{html,js}",
  ],
  theme: {
    colors: {
      "grammara1": "#2729D5",
      "grammara2": "#87CFCF",
      'white': '#ffffff',
    },
    fontFamily: {
      'poppins': ['Ubuntu', 'sans-serif'],
      'arial': ["Arial"],
    }
  },
  plugins: [],
}

