# devtools::install_github('charlie86/spotifyr')
# devtools::install_github('ppatrzyk/lastfmR')
library(tidyverse)
library(lastfmR)
library(spotifyr)

keys <- yaml::read_yaml('keys.yaml')

Sys.setenv(
  SPOTIFY_CLIENT_ID = keys$client_id,
  SPOTIFY_CLIENT_SECRET = keys$client_secret
)

user_id <- '12127359561'

access_token <- get_spotify_access_token()
get_spotify_authorization_code()

# pull all scrobbles (plays)
scrobbles <- get_scrobbles(user = "connorroth98")
scrobbles_cleaned <- scrobbles %>%
  mutate(artist = str_to_lower(artist))

artists_total <- scrobbles_cleaned %>%
  group_by(artist) %>%
  tally()

# for recommendations, only look at the last week of listening
one_week_ago <- Sys.Date() - 7

artists_one_week <- scrobbles_cleaned %>%
  filter(date > one_week_ago) %>%
  group_by(artist) %>%
  tally()

# artists i've listened to the most in the last week
artists_most_listened_to <- artists_one_week %>%
  arrange(desc(n)) %>%
  slice(1:20) %>%
  pull(artist)

## create a cumulative data frame which includes 10 similar artists
## for each artist in my top 20
similar_artists <- data.frame(From = NA, To = NA, match = NA)

for (i in artists_most_listened_to) {
  a <- get_similar(i)
  similar_artists <- rbind(a, similar_artists)
}

similar_artists <- similar_artists %>%
  mutate(
    my_artist = str_to_lower(From),
    recommended_artist = str_to_lower(To),
    match = as.numeric(match)
  ) %>%
  select(my_artist, recommended_artist, match)

## first, left join the similar artists df just created to my total listening history
## this returns the total # of listens for a given artist (i want to avoid artists who i've already listened to!)
joined <- left_join(similar_artists,
                    artists_one_week,
                    by = c('my_artist' = 'artist')) %>%
  ## same thing but join with my last-week artists
  left_join(.,
            artists_total,
            by = c('recommended_artist' = 'artist')) %>%
  ## replace NAs with 0
  mutate(n.x = ifelse(is.na(n.x), 0, n.x),
         n.y = ifelse(is.na(n.y), 0, n.y)) %>%
  ## renaming
  select(
    my_artist,
    recommended_artist,
    match,
    num_listens_my_artist = 'n.x',
    num_listens_recommended_artist = 'n.y'
  ) %>%
  ## create a diff column. This is the key way that I will rank new artists
  mutate(diff = num_listens_my_artist - num_listens_recommended_artist)

## for each artist, pull 10 artists who i have never heard of
for_recommendations <- joined %>%
  filter(diff > 0) %>%
  filter(!str_detect(recommended_artist, "&")) %>%
  ## create a rank score based on match score and difference between artist listens and recommended artist listens
  mutate(score = diff * match)

recommended_artists <- for_recommendations %>%
  group_by(my_artist) %>%
  top_n(2, score) %>%
  # arrange(desc(score))
  pull(recommended_artist)

top_tracks <- data.frame(uri = NA)

for (i in recommended_artists) {
  artist_info <- search_spotify(i, type = "artist") %>%
    top_n(1, popularity)
  
  if(artist_info$popularity >= 70) {
    NULL
  } else {
  
  artist_id <- artist_info$id
  
  top_tracks_artist <-
    get_artist_top_tracks(id = artist_id,
                          market = "US",
                          authorization = get_spotify_access_token())
  
  if (length(top_tracks_artist) == 0) {
    NULL
  } else {
    top_tracks_artist <- top_tracks_artist %>%
      top_n(2, popularity) %>%
      select(uri)
    
    top_tracks <- rbind(top_tracks_artist, top_tracks)
    
  }
  }
}

top_tracks <- top_tracks %>% distinct(uri) %>% filter(complete.cases(uri)) %>% pull(uri) 

library(lubridate)

month_name <- month(Sys.Date(), label = TRUE, abbr = FALSE)
day_name <- day(Sys.Date())

playlist <- create_playlist(
  user_id = user_id,
  name = paste("Better Discover Weekly:", month_name, day_name),
  description =
    paste(
      'Discover Weekly, but make it good. Algorithmically created by Connor Rothschild on',
      month_name,
      day_name
    )
)

for (i in top_tracks) {
  print(i)
  add_tracks_to_playlist(playlist_id = playlist$id,
                         uris = i)
}
