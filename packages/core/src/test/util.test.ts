import { mergeResponsiveObjs, resolveStStyle } from '../util';

describe('resolveStStyle', () => {
    test('resolves static rules', () => {
        const style = resolveStStyle({
            color: 'green',
            display: 'block',
        });
        expect(style).toEqual({
            '?|color': 'green',
            '?|display': 'block',
        });
    });

    test('resolves dynamic rules at the top level', () => {
        const style = resolveStStyle(
            ({ primary, show }) => ({
                color: primary,
                display: show ? 'block' : 'none',
            }),
            { primary: 'green', show: true }
        );
        expect(style).toEqual({
            '?|color': 'green',
            '?|display': 'block',
        });
    });

    test('resolves dynamic rules at the property level', () => {
        const style = resolveStStyle(
            {
                color: ({ primary }) => primary,
                display: ({ show }) => (show ? 'block' : 'none'),
            },
            { primary: 'green', show: true }
        );
        expect(style).toEqual({
            '?|color': 'green',
            '?|display': 'block',
        });
    });

    test('resolves dynamic rules at multiple levels', () => {
        const style = resolveStStyle(
            ({ show }) => ({
                color: ({ primary }) => primary,
                display: show ? 'block' : 'none',
            }),
            { primary: 'green', show: true }
        );
        expect(style).toEqual({
            '?|color': 'green',
            '?|display': 'block',
        });
    });

    test('resolves psuedo selectors', () => {
        const style = resolveStStyle({
            color: 'green',
            ':hover': {
                color: 'purple',
            },
        });
        expect(style).toEqual({
            '?|color': 'green',
            '?:hover|color': 'purple',
        });
    });

    test('resolves nested selectors', () => {
        const style = resolveStStyle({
            color: 'green',
            '&': [
                '.parent & .child',
                {
                    color: 'purple',
                },
            ],
        });
        expect(style).toEqual({
            '?|color': 'green',
            '.parent ? .child|color': 'purple',
        });
    });

    test('resolves nested selectors without "&"', () => {
        const style = resolveStStyle({
            color: 'green',
            '&': [
                'p',
                {
                    color: 'purple',
                },
            ],
        });
        expect(style).toEqual({
            '?|color': 'green',
            '? p|color': 'purple',
        });
    });

    test('resolves nested selectors with expansions', () => {
        const style = resolveStStyle({
            color: 'green',
            '&': [
                '&:hover,p',
                {
                    color: 'purple',
                },
            ],
        });
        expect(style).toEqual({
            '?|color': 'green',
            '?:hover|color': 'purple',
            '? p|color': 'purple',
        });
    });

    test('resolves deeply nested selectors', () => {
        const style = resolveStStyle({
            color: 'green',
            '&': [
                'p',
                {
                    '&': [
                        '.parent & > span',
                        {
                            color: 'purple',
                            ':hover': {
                                color: 'red',
                            },
                        },
                    ],
                },
            ],
        });
        expect(style).toEqual({
            '?|color': 'green',
            '.parent ? p > span|color': 'purple',
            '.parent ? p > span:hover|color': 'red',
        });
    });

    test('resolves deeply nested selectors using "?" directly', () => {
        const style = resolveStStyle({
            color: 'green',
            '&': [
                'p',
                {
                    '&': [
                        '?',
                        {
                            color: 'purple',
                        },
                    ],
                },
            ],
        });
        expect(style).toEqual({
            '?|color': 'purple',
        });
    });

    test('leaves responsive values alone', () => {
        const style = resolveStStyle(
            ({ show }) => ({
                color: ({ primary }) => [primary, 'gold'],
                display: show ? ['flex', 'block'] : 'none',
            }),
            { primary: 'green', show: true }
        );
        expect(style).toEqual({
            '?|color': ['green', 'gold'],
            '?|display': ['flex', 'block'],
        });
    });

    describe('with transformers', () => {
        const transformSize = (prop: string, val: string) => {
            if (prop === 'size') {
                return {
                    width: val,
                    height: val,
                };
            }
        };

        const transformPx = (_: string, val: string) => `${val}px`;

        test('applies transformers that only change value', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const style = resolveStStyle({ width: 3 } as any, undefined, [transformPx]);
            expect(style).toEqual({
                '?|width': '3px',
            });
        });

        test('applies transformers that produce multiple values', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const style = resolveStStyle({ size: 3 } as any, undefined, [transformSize]);
            expect(style).toEqual({
                '?|width': 3,
                '?|height': 3,
            });
        });

        test('applies multiple transformers', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const style = resolveStStyle({ size: 3 } as any, undefined, [transformSize, transformPx]);
            expect(style).toEqual({
                '?|width': '3px',
                '?|height': '3px',
            });
        });

        test('preserves value when transformers return undefined', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const style = resolveStStyle({ size: 3 } as any, undefined, [() => undefined]);
            expect(style).toEqual({
                '?|size': 3,
            });
        });

        test('applies transformers to responsive values that produce multiple values', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const style = resolveStStyle({ size: [3, 4] } as any, undefined, [transformSize]);
            expect(style).toEqual({
                '?|width': [3, 4],
                '?|height': [3, 4],
            });
        });
    });
});

describe('mergeResponsiveObjs', () => {
    test('merges simple non responsive styles from left to right', () => {
        const obj = mergeResponsiveObjs([
            {
                color: 'green',
                display: 'block',
            },
            {
                color: 'blue',
            },
            {
                display: 'flex',
            },
        ]);

        expect(obj).toEqual({
            color: 'blue',
            display: 'flex',
        });
    });

    test('overwrites responsive styles with non-responsive ones', () => {
        const obj = mergeResponsiveObjs([
            {
                color: ['green', 'blue'],
            },
            {
                color: 'red',
            },
        ]);

        expect(obj).toEqual({
            color: 'red',
        });
    });

    test('overwrites non-responsive styles with responsive ones', () => {
        const obj = mergeResponsiveObjs([
            {
                color: 'red',
            },
            {
                color: ['green', 'blue'],
            },
        ]);

        expect(obj).toEqual({
            color: ['green', 'blue', 'blue', 'blue'],
        });
    });

    test('treats "undefined" as the responsive value at the previous index', () => {
        const obj = mergeResponsiveObjs([
            {
                color: ['red', , 'blue'],
            },
        ]);

        expect(obj).toEqual({
            color: ['red', 'red', 'blue', 'blue'],
        });
    });

    test('treats "null" as the current responsive value at the same index', () => {
        const obj = mergeResponsiveObjs([
            {
                color: 'red',
                display: ['flex', , 'block'],
            },
            {
                color: ['green', null, 'yellow'],
                display: ['block', null],
            },
        ]);

        expect(obj).toEqual({
            color: ['green', 'red', 'yellow', 'yellow'],
            display: ['block', 'flex', 'block', 'block'],
        });
    });

    test('treats leading undefined responsive values the same as null', () => {
        const obj = mergeResponsiveObjs([
            {
                color: 'red',
            },
            {
                color: [, , 'yellow'],
            },
        ]);

        expect(obj).toEqual({
            color: ['red', 'red', 'yellow', 'yellow'],
        });
    });

    test('flattens responsive values that contain only one unique value', () => {
        const obj = mergeResponsiveObjs([
            {
                color: ['red'],
                display: ['block', undefined, 'block'],
            },
            {
                color: ['red', undefined],
                display: ['block'],
            },
        ]);

        expect(obj).toEqual({
            color: 'red',
            display: 'block',
        });
    });

    test('remove values that resolve to empty arrays, null, or undefined', () => {
        const obj = mergeResponsiveObjs([
            {
                color: [],
                display: [, ,],
                opacity: null,
                border: undefined,
            },
        ]);

        expect(obj).toEqual({});
    });
});
