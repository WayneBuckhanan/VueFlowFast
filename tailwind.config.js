/** @type {import('tailwindcss').Config} */
export default {
  content: ['index.html','./src/**/*.{js,jsx,ts,tsx,vue,html}'],
  theme: {
    screens: {
      // mobile starts at 0px as unprefixed:class
      // ios-resolution.com lists iphones as up to 440px logical width
      //     iPh X-16 have 812-956px logical height and 750-1320px physical width
      '720p':   '700px', // HD 1280x720; 1366x768, 810x1080, 1280x1024, 768x1024, 1280x800, 1024x768
      '1080p': '1400px', // FHD 1920x1080; 1536x864, 1440x900, 1600x900, 1680x1050, 1920x1200
      '1440p': '2100px', // QHD 2560x1440
      '2k':    '2100px', // alias of 1440p
      '4k':    '3500px', // UHD 3840x2160
      '8k':    '7000px', // 7680x4320
      // aliases in case we pull in default selectors
      'sm':'700px', 'md':'1400px', 'lg':'2100px', 'xl':'3500px', '2xl':'7000px',
      // ipads range from 744-1366 px width/height
      // aliases to use ipad:max-laptop:class
      //'ipad':   '700px',
      //'laptop':'1400px',
    },
    extend: {
    },
  },
  plugins: [],
}

