import { useStorybookApi, shortcutToHumanString } from '@storybook/manager-api';
import { styled } from '@storybook/theming';
// import type { DownshiftState, StateChangeOptions } from 'downshift';
// import Downshift from 'downshift';
import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import { global } from '@storybook/global';
import React, { useRef, useState, useCallback } from 'react';
import { CloseIcon, SearchIcon } from '@storybook/icons';
import { DEFAULT_REF_ID } from './constants';
import type {
  CombinedDataset,
  SearchItem,
  SearchResult,
  // DownshiftItem,
  SearchChildrenFn,
  Selection,
} from './types';
import { isSearchResult, isExpandType } from './types';

import { scrollIntoView, searchItem } from './util/tree';
import { getGroupStatus, getHighestStatus } from './util/status';
import { useLayout } from './LayoutProvider';

const DEFAULT_MAX_SEARCH_RESULTS = 50;

const options = {
  shouldSort: true,
  tokenize: true,
  findAllMatches: true,
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'path', weight: 0.3 },
  ],
} as IFuseOptions<SearchItem>;

const ScreenReaderLabel = styled.label({
  position: 'absolute',
  left: -10000,
  top: 'auto',
  width: 1,
  height: 1,
  overflow: 'hidden',
});

const SearchIconWrapper = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 8,
  zIndex: 1,
  pointerEvents: 'none',
  color: theme.textMutedColor,
  display: 'flex',
  alignItems: 'center',
  height: '100%',
}));

const SearchField = styled.div({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
});

const Input = styled.input(({ theme }) => ({
  appearance: 'none',
  height: 32,
  paddingLeft: 28,
  paddingRight: 28,
  border: `1px solid ${theme.appBorderColor}`,
  background: 'transparent',
  borderRadius: 4,
  fontSize: `${theme.typography.size.s1 + 1}px`,
  fontFamily: 'inherit',
  transition: 'all 150ms',
  color: theme.color.defaultText,
  width: '100%',

  '&:focus, &:active': {
    outline: 0,
    borderColor: theme.color.secondary,
    background: theme.background.app,
  },
  '&::placeholder': {
    color: theme.textMutedColor,
    opacity: 1,
  },
  '&:valid ~ code, &:focus ~ code': {
    display: 'none',
  },
  '&:invalid ~ svg': {
    display: 'none',
  },
  '&:valid ~ svg': {
    display: 'block',
  },
  '&::-ms-clear': {
    display: 'none',
  },
  '&::-webkit-search-decoration, &::-webkit-search-cancel-button, &::-webkit-search-results-button, &::-webkit-search-results-decoration':
    {
      display: 'none',
    },
}));

const FocusKey = styled.code(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 9,
  height: 16,
  zIndex: 1,
  lineHeight: '16px',
  textAlign: 'center',
  fontSize: '11px',
  color: theme.base === 'light' ? theme.color.dark : theme.textMutedColor,
  userSelect: 'none',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}));

const FocusKeyCmd = styled.span({
  fontSize: '14px',
});

const ClearIcon = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  right: 8,
  zIndex: 1,
  color: theme.textMutedColor,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  height: '100%',
}));

const FocusContainer = styled.div({ outline: 0 });

export const Search = React.memo<{
  children: SearchChildrenFn;
  dataset: CombinedDataset;
  enableShortcuts?: boolean;
  getLastViewed: () => Selection[];
  initialQuery?: string;
}>(function Search({
  children,
  dataset,
  enableShortcuts = true,
  getLastViewed,
  initialQuery = '',
}) {
  const api = useStorybookApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputPlaceholder, setPlaceholder] = useState('Find components');
  const [allComponents, showAllComponents] = useState(false);
  const searchShortcut = api ? shortcutToHumanString(api.getShortcutKeys().search) : '/';

  const selectStory = useCallback(
    (id: string, refId: string) => {
      if (api) {
        api.selectStory(id, undefined, { ref: refId !== DEFAULT_REF_ID && refId });
      }
      inputRef.current.blur();
      showAllComponents(false);
    },
    [api, inputRef, showAllComponents]
  );

  const makeFuse = useCallback(() => {
    const list = dataset.entries.reduce<SearchItem[]>((acc, [refId, { index, status }]) => {
      const groupStatus = getGroupStatus(index || {}, status);

      if (index) {
        acc.push(
          ...Object.values(index).map((item) => {
            const statusValue =
              status && status[item.id]
                ? getHighestStatus(Object.values(status[item.id] || {}).map((s) => s.status))
                : null;
            return {
              ...searchItem(item, dataset.hash[refId]),
              status: statusValue || groupStatus[item.id] || null,
            };
          })
        );
      }
      return acc;
    }, []);
    return new Fuse(list, options);
  }, [dataset]);

  const getResults = useCallback(
    (input: string) => {
      const fuse = makeFuse();
      if (!input) return [];

      let results = [];
      const resultIds: Set<string> = new Set();
      const distinctResults = (fuse.search(input) as SearchResult[]).filter(({ item }) => {
        if (
          !(item.type === 'component' || item.type === 'docs' || item.type === 'story') ||
          resultIds.has(item.parent)
        ) {
          return false;
        }
        resultIds.add(item.id);
        return true;
      });

      if (distinctResults.length) {
        results = distinctResults.slice(0, allComponents ? 1000 : DEFAULT_MAX_SEARCH_RESULTS);
        if (distinctResults.length > DEFAULT_MAX_SEARCH_RESULTS && !allComponents) {
          results.push({
            showAll: () => showAllComponents(true),
            totalCount: distinctResults.length,
            moreCount: distinctResults.length - DEFAULT_MAX_SEARCH_RESULTS,
          });
        }
      }

      return results;
    },
    [allComponents, makeFuse]
  );

  const { isMobile } = useLayout();

  return (
    <Downshift<DownshiftItem>
      initialInputValue={initialQuery}
      stateReducer={stateReducer}
      itemToString={(result) => result?.item?.name || ''}
    >
      {({
        isOpen,
        openMenu,
        closeMenu,
        inputValue,
        clearSelection,
        getInputProps,
        getItemProps,
        getLabelProps,
        getMenuProps,
        getRootProps,
        highlightedIndex,
      }) => {
        const input = inputValue ? inputValue.trim() : '';
        let results = input ? getResults(input) : [];

        const lastViewed = !input && getLastViewed();
        if (lastViewed && lastViewed.length) {
          results = lastViewed.reduce((acc, { storyId, refId }) => {
            const data = dataset.hash[refId];
            if (data && data.index && data.index[storyId]) {
              const story = data.index[storyId];
              const item = story.type === 'story' ? data.index[story.parent] : story;
              // prevent duplicates
              if (!acc.some((res) => res.item.refId === refId && res.item.id === item.id)) {
                acc.push({ item: searchItem(item, dataset.hash[refId]), matches: [], score: 0 });
              }
            }
            return acc;
          }, []);
        }

        const inputId = 'storybook-explorer-searchfield';
        const inputProps = getInputProps({
          id: inputId,
          ref: inputRef,
          required: true,
          type: 'search',
          placeholder: inputPlaceholder,
          onFocus: () => {
            openMenu();
            setPlaceholder('Type to find...');
          },
          onBlur: () => setPlaceholder('Find components'),
        });

        const labelProps = getLabelProps({
          htmlFor: inputId,
        });

        return (
          <>
            <SearchField
              {...getRootProps({ refKey: '' }, { suppressRefError: true })}
              className="search-field"
            >
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              {/* @ts-expect-error (TODO) */}
              <Input {...inputProps} />
              {!isMobile && enableShortcuts && !isOpen && (
                <FocusKey>
                  {searchShortcut === '⌘ K' ? (
                    <>
                      <FocusKeyCmd>⌘</FocusKeyCmd>K
                    </>
                  ) : (
                    searchShortcut
                  )}
                </FocusKey>
              )}
              {isOpen && (
                <ClearIcon onClick={() => clearSelection()}>
                  <CloseIcon />
                </ClearIcon>
              )}
            </SearchField>
            <FocusContainer tabIndex={0} id="storybook-explorer-menu">
              {children({
                query: input,
                results,
                isBrowsing: !isOpen,
                closeMenu,
                getMenuProps,
                getItemProps,
                highlightedIndex,
              })}
            </FocusContainer>
          </>
        );
      }}
    </Downshift>
  );
});
