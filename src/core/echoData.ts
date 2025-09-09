
import type { EchoTask } from './types';

export const initialEchoTasks: EchoTask[] = [
  {
    id: 'task-1',
    name: 'Reading Time',
    time: '9:00 AM',
    icon: '📖',
    status: 'upcoming',
    type: 'reading',
    engagement: 'high',
    content: {
        title: 'The Little Astronaut\'s Big Adventure',
        body: 'Once upon a time, in a galaxy not so far away, lived a brave little astronaut named Alex. Alex had a shiny silver spaceship and a robot dog named Sparky. One sunny morning, Alex and Sparky decided to fly to the Marshmallow Moon...',
        imagePrompt: 'A child astronaut in a cute silver spaceship with a robot dog, flying towards a moon that looks like a marshmallow, cartoon style.'
    }
  },
  {
    id: 'task-2',
    name: 'Math Fun',
    time: '10:00 AM',
    icon: '➕',
    status: 'upcoming',
    type: 'math',
    engagement: 'medium',
    content: {
        title: 'Counting Stars!',
        body: 'Let\'s count the stars! If you have 3 stars and you find 2 more, how many stars do you have in total?'
    }
  },
  {
    id: 'task-3',
    name: 'Art Corner',
    time: '11:00 AM',
    icon: '🎨',
    status: 'upcoming',
    type: 'art',
    engagement: 'high',
    content: {
        title: 'Draw a Friendly Alien',
        body: 'Let\'s draw a new friend! Imagine a friendly alien from the planet Glimmer. Does it have three eyes? Does it have sparkly antennae? Let\'s see your creation!'
    }
  },
  {
    id: 'task-4',
    name: 'Mealtime',
    time: '12:00 PM',
    icon: '🍎',
    status: 'upcoming',
    type: 'meal',
    engagement: 'none',
    content: {
        title: 'Time for Lunch!',
        body: 'Enjoy your delicious meal!'
    }
  },
  {
    id: 'task-5',
    name: 'Writing Practice',
    time: '1:00 PM',
    icon: '✍️',
    status: 'upcoming',
    type: 'writing',
    engagement: 'low',
    content: {
        title: 'Let\'s Write Our Name',
        body: 'Practice writing the letters of your name. You can do it!'
    }
  },
    {
    id: 'task-6',
    name: 'Free Play',
    time: '2:00 PM',
    icon: '🪁',
    status: 'upcoming',
    type: 'play',
    engagement: 'none',
     content: {
        title: 'Time for Fun!',
        body: 'Enjoy your free play time with your favorite toys!'
    }
  },
];
