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

pub mod workshop {
    use bincode::{Decode, Encode};
    use serde::Serialize;

    #[derive(Debug, Clone, Serialize, Encode, Decode)]
    pub enum UgcItemVisibility {
        Public,
        FriendsOnly,
        Private,
        Unlisted,
    }

    impl From<steamworks::PublishedFileVisibility> for UgcItemVisibility {
        fn from(visibility: steamworks::PublishedFileVisibility) -> Self {
            match visibility {
                steamworks::PublishedFileVisibility::Public => UgcItemVisibility::Public,
                steamworks::PublishedFileVisibility::FriendsOnly => UgcItemVisibility::FriendsOnly,
                steamworks::PublishedFileVisibility::Private => UgcItemVisibility::Private,
                steamworks::PublishedFileVisibility::Unlisted => UgcItemVisibility::Unlisted,
            }
        }
    }

    impl From<UgcItemVisibility> for steamworks::PublishedFileVisibility {
        fn from(val: UgcItemVisibility) -> Self {
            match val {
                UgcItemVisibility::Public => steamworks::PublishedFileVisibility::Public,
                UgcItemVisibility::FriendsOnly => steamworks::PublishedFileVisibility::FriendsOnly,
                UgcItemVisibility::Private => steamworks::PublishedFileVisibility::Private,
                UgcItemVisibility::Unlisted => steamworks::PublishedFileVisibility::Unlisted,
            }
        }
    }

    #[derive(Debug)]
    pub enum UpdateStatus {
        Invalid,
        PreparingConfig,
        PreparingContent,
        UploadingContent,
        UploadingPreviewFile,
        CommittingChanges,
    }

    impl From<steamworks::UpdateStatus> for UpdateStatus {
        fn from(visibility: steamworks::UpdateStatus) -> Self {
            match visibility {
                steamworks::UpdateStatus::Invalid => UpdateStatus::Invalid,
                steamworks::UpdateStatus::PreparingConfig => UpdateStatus::PreparingConfig,
                steamworks::UpdateStatus::PreparingContent => UpdateStatus::PreparingContent,
                steamworks::UpdateStatus::UploadingContent => UpdateStatus::UploadingContent,
                steamworks::UpdateStatus::UploadingPreviewFile => {
                    UpdateStatus::UploadingPreviewFile
                }
                steamworks::UpdateStatus::CommittingChanges => UpdateStatus::CommittingChanges,
            }
        }
    }
}
