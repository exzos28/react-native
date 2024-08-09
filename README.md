# Storybook for React Native

With Storybook for React Native you can design and develop individual React Native components without running your app.

This readme is for the 7.6.10 version, you can find the 6.5 docs [here](https://github.com/storybookjs/react-native/tree/v6.5-stable).

If you are migrating from 6.5 to 7.6 you can find the migration guide [here](https://github.com/storybookjs/react-native/blob/next/MIGRATION.md#from-version-65x-to-76x)

For more information about storybook visit: [storybook.js.org](https://storybook.js.org)

> NOTE: `@storybook/react-native` requires atleast 7.6.10, if you install other storybook core packages they should be `^7.6.10` or newer.

If you want to help out or are just curious then check out the [project board](https://github.com/orgs/storybookjs/projects/12) to see the open issues.

![picture of storybook](https://user-images.githubusercontent.com/3481514/145904252-92e3dc1e-591f-410f-88a1-b4250f4ba6f2.png)

_Pictured is from the template mentioned in [getting started](#getting-started)_

## Table of contents

- 🚀 [Getting Started](#getting-started)
- 📒 [Writing stories](#writing-stories)
- 🔌 [Addons](#addons)
- 📱 [Hide/Show Storybook](#hideshow-storybook)
- 🔧 [getStorybookUI](#getstorybookui-options)
- 🧪 [Using stories in unit tests](#using-stories-in-unit-tests)
- 🤝 [Contributing](#contributing)
- ✨ [Examples](#examples)

## Getting Started

### New project

There is some project boilerplate with `@storybook/react-native` and `@storybook/addon-react-native-web` both already configured with a simple example.

For expo you can use this [template](https://github.com/dannyhw/expo-template-storybook) with the following command

```sh
# With NPM
npx create-expo-app --template expo-template-storybook AwesomeStorybook
```

For react native cli you can use this [template](https://github.com/dannyhw/react-native-template-storybook)

```sh
npx react-native init MyApp --template react-native-template-storybook
```

### Existing project

Run init to setup your project with all the dependencies and configuration files:

```sh
npx storybook@latest init
```

The only thing left to do is return Storybook's UI in your app entry point (such as `App.tsx`) like this:

```tsx
export { default } from './.storybook';
```

If you want to be able to swap easily between storybook and your app, have a look at this [blog post](https://dev.to/dannyhw/how-to-swap-between-react-native-storybook-and-your-app-p3o)

If you want to add everything yourself check out the the manual guide [here](https://github.com/storybookjs/react-native/blob/next/MANUAL_SETUP.md).

#### Additional steps: Update your metro config

We require the unstable_allowRequireContext transformer option to enable dynamic story imports based on the stories glob in `main.ts`. We can also call the storybook generate function from the metro config to automatically generate the `storybook.requires.ts` file when metro runs.

**Expo**

First create metro config file if you don't have it yet.

```sh
npx expo customize metro.config.js
```

Then set `transformer.unstable_allowRequireContext` to true and add the generate call here.

```js
// metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const { generate } = require('@storybook/react-native/scripts/generate');

generate({
  configPath: path.resolve(__dirname, './.storybook'),
});

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.transformer.unstable_allowRequireContext = true;

config.resolver.sourceExts.push('mjs');

module.exports = config;
```

**React native**

```js
const path = require('path');
const { generate } = require('@storybook/react-native/scripts/generate');

generate({
  configPath: path.resolve(__dirname, './.storybook'),
});

module.exports = {
  /* existing config */
  transformer: {
    unstable_allowRequireContext: true,
  },
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs'],
  },
};
```

## Writing stories

In storybook we use a syntax called CSF that looks like this:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyButton } from './Button';

const meta = {
  component: MyButton,
} satisfies Meta<typeof MyButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    text: 'Hello World',
    color: 'purple',
  },
};
```

You should configure the path to your story files in the `main.ts` config file from the `.storybook` folder.

```ts
// .storybook/main.ts
import { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: ['../components/**/*.stories.?(ts|tsx|js|jsx)'],
  addons: [],
};

export default main;
```

### Decorators and Parameters

For stories you can add decorators and parameters on the default export or on a specifc story.

```tsx
import type { Meta } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Button',
  component: Button,
  decorators: [
    (Story) => (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    backgrounds: {
      values: [
        { name: 'red', value: '#f00' },
        { name: 'green', value: '#0f0' },
        { name: 'blue', value: '#00f' },
      ],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
```

For global decorators and parameters, you can add them to `preview.tsx` inside your `.storybook` folder.

```tsx
// .storybook/preview.tsx
import type { Preview } from '@storybook/react';
import { withBackgrounds } from '@storybook/addon-ondevice-backgrounds';

const preview: Preview = {
  decorators: [
    withBackgrounds,
    (Story) => (
      <View style={{ flex: 1, color: 'blue' }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'plain',
      values: [
        { name: 'plain', value: 'white' },
        { name: 'warm', value: 'hotpink' },
        { name: 'cool', value: 'deepskyblue' },
      ],
    },
  },
};

export default preview;
```

## Addons

The cli will install some basic addons for you such as controls and actions.
Ondevice addons are addons that can render with the device ui that you see on the phone.

Currently the addons available are:

- [`@storybook/addon-ondevice-controls`](https://storybook.js.org/addons/@storybook/addon-ondevice-controls): adjust your components props in realtime
- [`@storybook/addon-ondevice-actions`](https://storybook.js.org/addons/@storybook/addon-ondevice-actions): mock onPress calls with actions that will log information in the actions tab
- [`@storybook/addon-ondevice-notes`](https://storybook.js.org/addons/@storybook/addon-ondevice-notes): Add some markdown to your stories to help document their usage
- [`@storybook/addon-ondevice-backgrounds`](https://storybook.js.org/addons/@storybook/addon-ondevice-backgrounds): change the background of storybook to compare the look of your component against different backgrounds

Install each one you want to use and add them to the `main.ts` addons list as follows:

```ts
// .storybook/main.ts
import { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  // ... rest of config
  addons: [
    '@storybook/addon-ondevice-notes',
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-backgrounds',
    '@storybook/addon-ondevice-actions',
  ],
};

export default main;
```

### Using the addons in your story

For details of each ondevice addon you can see the readme:

- [actions](https://github.com/storybookjs/react-native/tree/next/packages/ondevice-actions#readme)
- [backgrounds](https://github.com/storybookjs/react-native/tree/next/packages/ondevice-backgrounds#readme)
- [controls](https://github.com/storybookjs/react-native/tree/next/packages/ondevice-controls#readme)
- [notes](https://github.com/storybookjs/react-native/tree/next/packages/ondevice-notes#readme)

## Hide/Show storybook

Storybook on react native is a normal React Native component that can be used or hidden anywhere in your RN application based on your own logic.

You can also create a separate app just for storybook that also works as a package for your visual components.
Some have opted to toggle the storybook component by using a custom option in the react native developer menu.

- [Heres an approach for react native cli](https://dev.to/dannyhw/multiple-entry-points-for-react-native-storybook-4dkp)
- [Heres an article about how you can do it in expo](https://dev.to/dannyhw/how-to-swap-between-react-native-storybook-and-your-app-p3o)

## getStorybookUI options

You can pass these parameters to getStorybookUI call in your storybook entry point:

```
{
    tabOpen: Number (0)
        -- which tab should be open. -1 Sidebar, 0 Canvas, 1 Addons
    initialSelection: string | Object (undefined)
        -- initialize storybook with a specific story.  eg: `mybutton--largebutton` or `{ kind: 'MyButton', name: 'LargeButton' }`
    shouldDisableKeyboardAvoidingView: Boolean (false)
        -- Disable KeyboardAvoidingView wrapping Storybook's view
    keyboardAvoidingViewVerticalOffset: Number (0)
        -- With shouldDisableKeyboardAvoidingView=true, this will set the keyboardverticaloffset (https://facebook.github.io/react-native/docs/keyboardavoidingview#keyboardverticaloffset) value for KeyboardAvoidingView wrapping Storybook's view
}
```

## Using stories in unit tests

Storybook provides testing utilities that allow you to reuse your stories in external test environments, such as Jest. This way you can write unit tests easier and reuse the setup which is already done in Storybook, but in your unit tests. You can find more information about it in the [portable stories section](./PORTABLE_STORIES.md).

## Contributing

We welcome contributions to Storybook!

- 📥 Pull requests and 🌟 Stars are always welcome.
- Read our [contributing guide](CONTRIBUTING.md) to get started,
  or find us on [Discord](https://discord.gg/sMFvFsG) and look for the react-native channel.

Looking for a first issue to tackle?

- We tag issues with [Good First Issue](https://github.com/storybookjs/react-native/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) when we think they are well suited for people who are new to the codebase or OSS in general.
- [Talk to us](https://discord.gg/sMFvFsG), we'll find something to suits your skills and learning interest.

## Examples

Here are some example projects to help you get started

- A mono repo setup by @axeldelafosse https://github.com/axeldelafosse/storybook-rnw-monorepo
- Expo setup https://github.com/dannyhw/expo-storybook-starter
- React native cli setup https://github.com/dannyhw/react-native-storybook-starter
- Adding a separate entry point and dev menu item in native files for RN CLI project: https://github.com/zubko/react-native-storybook-with-dev-menu
- Want to showcase your own project? open a PR and add it to the list!
