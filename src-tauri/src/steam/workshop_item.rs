// MIT License
//
// Copyright (c) 2022 Gabriel Francisco Dos Santos
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// Modified by Burak Kartal on [01/05/2025]

use std::collections::HashSet;

use regex::Regex;

fn capitalize(s: String) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

fn is_filtered_tag(tag: &str) -> bool {
    let version_regex = Regex::new(r"^[VvEe]\s*\d+(\.\d+)*(\.[Xx])?$").unwrap();
    let excluded_tags: HashSet<&str> = ["mod", "Singleplayer", "Native"].iter().cloned().collect();

    version_regex.is_match(tag) || excluded_tags.contains(tag)
}

pub mod workshop {
	use serde::Serialize;
	use bincode::{Encode, Decode};
    use steamworks::FileType;

    use crate::steam::localplayer::PlayerSteamId;
    use crate::steam::workshop::workshop::UgcItemVisibility;

    use super::{capitalize, is_filtered_tag};

    pub enum UGCQueryType {
        RankedByVote,
        RankedByPublicationDate,
        AcceptedForGameRankedByAcceptanceDate,
        RankedByTrend,
        FavoritedByFriendsRankedByPublicationDate,
        CreatedByFriendsRankedByPublicationDate,
        RankedByNumTimesReported,
        CreatedByFollowedUsersRankedByPublicationDate,
        NotYetRated,
        RankedByTotalVotesAsc,
        RankedByVotesUp,
        RankedByTextSearch,
        RankedByTotalUniqueSubscriptions,
        RankedByPlaytimeTrend,
        RankedByTotalPlaytime,
        RankedByAveragePlaytimeTrend,
        RankedByLifetimeAveragePlaytime,
        RankedByPlaytimeSessionsTrend,
        RankedByLifetimePlaytimeSessions,
        RankedByLastUpdatedDate,
    }

    impl From<UGCQueryType> for steamworks::UGCQueryType {
        fn from(val: UGCQueryType) -> Self {
            match val {
                UGCQueryType::RankedByVote => steamworks::UGCQueryType::RankedByVote,
                UGCQueryType::RankedByPublicationDate => {
                    steamworks::UGCQueryType::RankedByPublicationDate
                }
                UGCQueryType::AcceptedForGameRankedByAcceptanceDate => {
                    steamworks::UGCQueryType::AcceptedForGameRankedByAcceptanceDate
                }
                UGCQueryType::RankedByTrend => steamworks::UGCQueryType::RankedByTrend,
                UGCQueryType::FavoritedByFriendsRankedByPublicationDate => {
                    steamworks::UGCQueryType::FavoritedByFriendsRankedByPublicationDate
                }
                UGCQueryType::CreatedByFriendsRankedByPublicationDate => {
                    steamworks::UGCQueryType::CreatedByFriendsRankedByPublicationDate
                }
                UGCQueryType::RankedByNumTimesReported => {
                    steamworks::UGCQueryType::RankedByNumTimesReported
                }
                UGCQueryType::CreatedByFollowedUsersRankedByPublicationDate => {
                    steamworks::UGCQueryType::CreatedByFollowedUsersRankedByPublicationDate
                }
                UGCQueryType::NotYetRated => steamworks::UGCQueryType::NotYetRated,
                UGCQueryType::RankedByTotalVotesAsc => {
                    steamworks::UGCQueryType::RankedByTotalVotesAsc
                }
                UGCQueryType::RankedByVotesUp => steamworks::UGCQueryType::RankedByVotesUp,
                UGCQueryType::RankedByTextSearch => steamworks::UGCQueryType::RankedByTextSearch,
                UGCQueryType::RankedByTotalUniqueSubscriptions => {
                    steamworks::UGCQueryType::RankedByTotalUniqueSubscriptions
                }
                UGCQueryType::RankedByPlaytimeTrend => {
                    steamworks::UGCQueryType::RankedByPlaytimeTrend
                }
                UGCQueryType::RankedByTotalPlaytime => {
                    steamworks::UGCQueryType::RankedByTotalPlaytime
                }
                UGCQueryType::RankedByAveragePlaytimeTrend => {
                    steamworks::UGCQueryType::RankedByAveragePlaytimeTrend
                }
                UGCQueryType::RankedByLifetimeAveragePlaytime => {
                    steamworks::UGCQueryType::RankedByLifetimeAveragePlaytime
                }
                UGCQueryType::RankedByPlaytimeSessionsTrend => {
                    steamworks::UGCQueryType::RankedByPlaytimeSessionsTrend
                }
                UGCQueryType::RankedByLifetimePlaytimeSessions => {
                    steamworks::UGCQueryType::RankedByLifetimePlaytimeSessions
                }
                UGCQueryType::RankedByLastUpdatedDate => {
                    steamworks::UGCQueryType::RankedByLastUpdatedDate
                }
            }
        }
    }

    pub enum UGCType {
        Items,
        ItemsMtx,
        ItemsReadyToUse,
        Collections,
        Artwork,
        Videos,
        Screenshots,
        AllGuides,
        WebGuides,
        IntegratedGuides,
        UsableInGame,
        ControllerBindings,
        GameManagedItems,
        All,
    }

    impl From<UGCType> for steamworks::UGCType {
        fn from(val: UGCType) -> Self {
            match val {
                UGCType::Items => steamworks::UGCType::Items,
                UGCType::ItemsMtx => steamworks::UGCType::ItemsMtx,
                UGCType::ItemsReadyToUse => steamworks::UGCType::ItemsReadyToUse,
                UGCType::Collections => steamworks::UGCType::Collections,
                UGCType::Artwork => steamworks::UGCType::Artwork,
                UGCType::Videos => steamworks::UGCType::Videos,
                UGCType::Screenshots => steamworks::UGCType::Screenshots,
                UGCType::AllGuides => steamworks::UGCType::AllGuides,
                UGCType::WebGuides => steamworks::UGCType::WebGuides,
                UGCType::IntegratedGuides => steamworks::UGCType::IntegratedGuides,
                UGCType::UsableInGame => steamworks::UGCType::UsableInGame,
                UGCType::ControllerBindings => steamworks::UGCType::ControllerBindings,
                UGCType::GameManagedItems => steamworks::UGCType::GameManagedItems,
                UGCType::All => steamworks::UGCType::All,
            }
        }
    }

    pub enum UserListType {
        Published,
        VotedOn,
        VotedUp,
        VotedDown,
        Favorited,
        Subscribed,
        UsedOrPlayed,
        Followed,
    }

    impl From<UserListType> for steamworks::UserList {
        fn from(val: UserListType) -> Self {
            match val {
                UserListType::Published => steamworks::UserList::Published,
                UserListType::VotedOn => steamworks::UserList::VotedOn,
                UserListType::VotedUp => steamworks::UserList::VotedUp,
                UserListType::VotedDown => steamworks::UserList::VotedDown,
                UserListType::Favorited => steamworks::UserList::Favorited,
                UserListType::Subscribed => steamworks::UserList::Subscribed,
                UserListType::UsedOrPlayed => steamworks::UserList::UsedOrPlayed,
                UserListType::Followed => steamworks::UserList::Followed,
            }
        }
    }

    pub enum UserListOrder {
        CreationOrderAsc,
        CreationOrderDesc,
        TitleAsc,
        LastUpdatedDesc,
        SubscriptionDateDesc,
        VoteScoreDesc,
        ForModeration,
    }

    impl From<UserListOrder> for steamworks::UserListOrder {
        fn from(val: UserListOrder) -> Self {
            match val {
                UserListOrder::CreationOrderAsc => steamworks::UserListOrder::CreationOrderAsc,
                UserListOrder::CreationOrderDesc => steamworks::UserListOrder::CreationOrderDesc,
                UserListOrder::TitleAsc => steamworks::UserListOrder::TitleAsc,
                UserListOrder::LastUpdatedDesc => steamworks::UserListOrder::LastUpdatedDesc,
                UserListOrder::SubscriptionDateDesc => {
                    steamworks::UserListOrder::SubscriptionDateDesc
                }
                UserListOrder::VoteScoreDesc => steamworks::UserListOrder::VoteScoreDesc,
                UserListOrder::ForModeration => steamworks::UserListOrder::ForModeration,
            }
        }
    }

    #[derive(Debug, Clone, Serialize, Encode, Decode)]
    pub struct WorkshopItemStatistic {
        pub num_subscriptions: Option<u64>, //   0	gets the number of subscriptions.
        pub num_favorites: Option<u64>,     //   1	gets the number of favorites.
        pub num_followers: Option<u64>,     //   2	gets the number of followers.
        pub num_unique_subscriptions: Option<u64>, // 3	gets the number of unique subscriptions.
        pub num_unique_favorites: Option<u64>, // 4	gets the number of unique favorites.
        pub num_unique_followers: Option<u64>, // 5	gets the number of unique followers.
        pub num_unique_website_views: Option<u64>, //  6	gets the number of unique views the item has on its steam workshop page.
        pub report_score: Option<u64>, //    7	gets the number of times the item has been reported.
        pub num_seconds_played: Option<u64>, //   8	gets the total number of seconds this item has been used across all players.
        pub num_playtime_sessions: Option<u64>, //    9	gets the total number of play sessions this item has been used in.
        pub num_comments: Option<u64>, //    10	gets the number of comments on the items that steam has on its steam workshop page.
        pub num_seconds_played_during_time_period: Option<u64>, //   11	gets the number of seconds this item has been used over the given time period.
        pub num_playtime_sessions_during_time_period: Option<u64>, //    12	Gets the number of sessions this item has been used in over the given time period.
    }

    impl WorkshopItemStatistic {
        fn from_query_results(results: &steamworks::QueryResults, index: u32) -> Self {
            Self {
                num_subscriptions: results
                    .statistic(index, steamworks::UGCStatisticType::Subscriptions)
                    .map(u64::from),
                num_favorites: results
                    .statistic(index, steamworks::UGCStatisticType::Favorites)
                    .map(u64::from),
                num_followers: results
                    .statistic(index, steamworks::UGCStatisticType::Followers)
                    .map(u64::from),
                num_unique_subscriptions: results
                    .statistic(index, steamworks::UGCStatisticType::UniqueSubscriptions)
                    .map(u64::from),
                num_unique_favorites: results
                    .statistic(index, steamworks::UGCStatisticType::UniqueFavorites)
                    .map(u64::from),
                num_unique_followers: results
                    .statistic(index, steamworks::UGCStatisticType::UniqueFollowers)
                    .map(u64::from),
                num_unique_website_views: results
                    .statistic(index, steamworks::UGCStatisticType::UniqueWebsiteViews)
                    .map(u64::from),
                report_score: results
                    .statistic(index, steamworks::UGCStatisticType::Reports)
                    .map(u64::from),
                num_seconds_played: results
                    .statistic(index, steamworks::UGCStatisticType::SecondsPlayed)
                    .map(u64::from),
                num_playtime_sessions: results
                    .statistic(index, steamworks::UGCStatisticType::PlaytimeSessions)
                    .map(u64::from),
                num_comments: results
                    .statistic(index, steamworks::UGCStatisticType::Comments)
                    .map(u64::from),
                num_seconds_played_during_time_period: results
                    .statistic(
                        index,
                        steamworks::UGCStatisticType::SecondsPlayedDuringTimePeriod,
                    )
                    .map(u64::from),
                num_playtime_sessions_during_time_period: results
                    .statistic(
                        index,
                        steamworks::UGCStatisticType::PlaytimeSessionsDuringTimePeriod,
                    )
                    .map(u64::from),
            }
        }
    }

    #[derive(Debug, Clone, Serialize, Encode, Decode)]
    pub struct WorkshopItem {
        pub published_file_id: u64,
        pub creator_app_id: Option<u32>,
        pub consumer_app_id: Option<u32>,
        pub title: String,
        pub description: String,
        pub owner: PlayerSteamId,
        pub time_created: u128,
        pub time_updated: u128,
        pub time_added_to_user_list: u32,
        pub visibility: UgcItemVisibility,
        pub banned: bool,
        pub accepted_for_use: bool,
        pub tags: String,
        pub tags_truncated: bool,
        pub url: String,
        pub num_upvotes: u32,
        pub num_downvotes: u32,
        pub num_children: u32,
        pub preview_url: Option<String>,
        pub statistics: WorkshopItemStatistic,
        pub required_items: Vec<u64>,
        pub file_type: String,
        pub file_size: u32,
    }

    impl WorkshopItem {
        fn from_query_results(results: &steamworks::QueryResults, index: u32) -> Option<Self> {
            results.get(index).map(|item| {
                let time_created_u128 = item.time_created as u128;
                let time_updated_u128 = item.time_updated as u128;
                let time_created = time_created_u128.checked_mul(1000);
                let time_updated = time_updated_u128.checked_mul(1000);

                let required_items = results
                    .get_children(index)
                    .unwrap_or_default()
                    .into_iter()
                    .map(|file_id| u64::from(file_id.0))
                    .collect();

                let published_file_id = u64::from(item.published_file_id.0);

                let file_type = match item.file_type {
                    FileType::Community => "Community",
                    FileType::Microtransaction => "Microtransaction",
                    FileType::Collection => "Collection",
                    FileType::Art => "Art",
                    FileType::Video => "Video",
                    FileType::Screenshot => "Screenshot",
                    FileType::Game => "Game",
                    FileType::Software => "Software",
                    FileType::Concept => "Concept",
                    FileType::WebGuide => "WebGuide",
                    FileType::IntegratedGuide => "IntegratedGuide",
                    FileType::Merch => "Merch",
                    FileType::ControllerBinding => "ControllerBinding",
                    FileType::SteamworksAccessInvite => "SteamworksAccessInvite",
                    FileType::SteamVideo => "SteamVideo",
                    FileType::GameManagedItem => "GameManagedItem",
                };

                Self {
                    published_file_id,
                    creator_app_id: item.creator_app_id.map(|id| id.0),
                    consumer_app_id: item.consumer_app_id.map(|id| id.0),
                    title: item.title,
                    description: item.description,
                    owner: PlayerSteamId::from_steamid(item.owner),
                    time_created: time_created.unwrap_or(time_created_u128),
                    time_updated: time_updated.unwrap_or(time_updated_u128),
                    time_added_to_user_list: item.time_added_to_user_list,
                    visibility: item.visibility.into(),
                    banned: item.banned,
                    accepted_for_use: item.accepted_for_use,
                    tags: item
                        .tags
                        .iter()
                        .filter(|tag| !is_filtered_tag(tag))
                        .map(|tag| capitalize(tag.clone()).replace("Ui", "UI"))
                        .collect::<Vec<String>>()
                        .join(", "),
                    tags_truncated: item.tags_truncated,
                    url: item.url,
                    num_upvotes: item.num_upvotes,
                    num_downvotes: item.num_downvotes,
                    num_children: item.num_children,
                    preview_url: results.preview_url(index),
                    statistics: WorkshopItemStatistic::from_query_results(results, index),
                    required_items,
                    file_type: file_type.to_string(),
                    file_size: item.file_size,
                }
            })
        }
    }

    #[derive(Debug)]
    pub struct WorkshopItemsResult {
        pub items: Vec<Option<WorkshopItem>>,
        #[allow(dead_code)]
        pub was_cached: bool,
    }

    impl WorkshopItemsResult {
        pub fn from_query_results(query_results: steamworks::QueryResults) -> Self {
            Self {
                items: (0..query_results.returned_results())
                    .map(|i| WorkshopItem::from_query_results(&query_results, i))
                    .collect(),
                was_cached: query_results.was_cached(),
            }
        }
    }
}
