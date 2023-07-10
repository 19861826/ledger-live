import styled from "styled-components";
import { ProviderIconSize, ProviderIconSizes } from '@ledgerhq/ui-shared'

type StyledIconProps = {
  size: ProviderIconSize;
};

export const Icon = styled.img<StyledIconProps>`
  border-radius: 8px;
  width: ${({ size }) => ProviderIconSizes[size]}px;
  height: ${({ size }) => ProviderIconSizes[size]}px;
`;
