import { ChannelType } from "discord.js";

export enum CreatorType {
  RSS = "RSS",
  YouTube = "YouTube",
}

export const SupportedChannelTypes = [
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildAnnouncement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.GuildStageVoice,
  ChannelType.GuildForum,
] as const;
