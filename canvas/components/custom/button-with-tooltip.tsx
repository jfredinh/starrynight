import React from "react";
import { Button, ButtonProps } from "../ui/button";
import { WithTooltip } from "./with-tooltip";

export type TButtonWithTooltipProps = ButtonProps & {
  message: string;
};

export const ButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  TButtonWithTooltipProps
>(function BWT(props, ref) {
  const { message, ...rest } = props;
  return (
    <WithTooltip message={message}>
      <Button ref={ref} type="button" {...rest} />
    </WithTooltip>
  );
});
