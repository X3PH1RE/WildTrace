/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps &
  DefaultText['props'] & {
    type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  };
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const preset =
    type === 'title'
      ? { fontSize: 28, fontWeight: '700' as const }
      : type === 'subtitle'
        ? { fontSize: 20, fontWeight: '600' as const }
        : type === 'defaultSemiBold'
          ? { fontSize: 16, fontWeight: '600' as const }
          : type === 'link'
            ? { fontSize: 16, lineHeight: 24, color: '#2e78b7' }
            : { fontSize: 16 };

  return <DefaultText style={[{ color }, preset, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
