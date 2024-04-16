import React, { Children } from "react";

const Show = ({ children }: { children: React.ReactNode }) => {
  let when: React.ReactNode | null = null;
  let otherwise: React.ReactNode | null = null;

  Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const { type, props } = child as React.ReactElement;

      if (type === Show.When && props.isTrue) {
        when = props.children;
      } else if (type === Show.Else) {
        otherwise = props.children;
      }
    }
  });

  return when || otherwise || null;
};

const When = ({
  isTrue,
  children,
}: {
  isTrue?: boolean;
  children?: React.ReactNode;
}) => (isTrue ? <>{children}</> : null);

const Else = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

Show.When = When;
Show.Else = Else;

export { Show, When, Else };
