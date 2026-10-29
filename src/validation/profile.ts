import { z } from "zod";
import { androidApi, email, requiredCheckbox } from "./fields";

const playEmail = () => email("Enter the Google account email you use on Google Play.");
const deviceAndroidApi = () => androidApi("Choose your device's Android version.");

export const onboardingSchema = z.object({
  joinedGoogleGroup: requiredCheckbox("Join the Google Group and tick the box to confirm."),
  playEmail: playEmail(),
  deviceAndroidApi: deviceAndroidApi(),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(60, "Name must be at most 60 characters."),
  playEmail: playEmail(),
  deviceAndroidApi: deviceAndroidApi(),
});
export type ProfileInput = z.input<typeof profileSchema>;
