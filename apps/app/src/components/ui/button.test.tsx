import { describe, expect, jest, test } from "@jest/globals";
import { render, screen, userEvent } from "@testing-library/react-native";

import { Button } from "./button";
import { Text } from "./text";

describe("Button", () => {
  test("is announced as a button with its label, and runs its action when pressed", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress}>
        <Text>Save</Text>
      </Button>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("does nothing when disabled", async () => {
    const onPress = jest.fn();
    await render(
      <Button disabled onPress={onPress}>
        <Text>Save</Text>
      </Button>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
