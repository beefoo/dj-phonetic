const CONFIG = {
  filters: {
    kick: [
      {
        type: 'lowshelf',
        frequency: 500,
        gain: 20,
      }, {
        type: 'lowpass',
        frequency: 2000,
      },
    ],
    snare: [
      {
        type: 'highshelf',
        frequency: 1500,
        gain: 20,
      }, {
        type: 'highpass',
        frequency: 50,
      },
    ],
    hihat: [
      {
        type: 'highshelf',
        frequency: 3000,
        gain: 20,
      }, {
        type: 'highpass',
        frequency: 1000,
      },
    ],
  },
  instruments: ['kick', 'snare', 'hihat'],
};
