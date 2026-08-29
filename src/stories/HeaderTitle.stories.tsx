import EnvironmentBadge from '@components/EnvironmentBadge';
import HeaderTitle from '@components/HeaderTitle';

import type {Meta, StoryFn} from 'storybook-react-rsbuild';

import React from 'react';
import {View} from 'react-native';

type HeaderTitleStory = StoryFn<typeof HeaderTitle>;

/**
 * We use the Component Story Format for writing stories. Follow the docs here:
 *
 * https://storybook.js.org/docs/react/writing-stories/introduction#component-story-format
 */
const story: Meta<typeof HeaderTitle> = {
    title: 'Components/HeaderTitle',
    component: HeaderTitle,
};

const Default: HeaderTitleStory = () => (
    <HeaderTitle>
        <HeaderTitle.Text>Chats</HeaderTitle.Text>
    </HeaderTitle>
);

const WithSubtitleAndLink: HeaderTitleStory = () => (
    <HeaderTitle>
        <HeaderTitle.Text>Chats</HeaderTitle.Text>
        <HeaderTitle.Subtitle>Step 1 of 3</HeaderTitle.Subtitle>
        <HeaderTitle.SubtitleLink>https://new.expensify.com</HeaderTitle.SubtitleLink>
    </HeaderTitle>
);

// The badge is a standalone component; compose it as a sibling of the title block
const WithEnvironmentBadge: HeaderTitleStory = () => (
    <View style={{flex: 1, flexDirection: 'row'}}>
        <HeaderTitle>
            <HeaderTitle.Text>Chats</HeaderTitle.Text>
        </HeaderTitle>
        <EnvironmentBadge />
    </View>
);

export default story;
export {Default, WithSubtitleAndLink, WithEnvironmentBadge};
