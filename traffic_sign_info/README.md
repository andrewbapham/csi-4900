# Class List

The list of chosen classes is based on consilidated data that has been scraped using the defined Ottawa, Quebec City and Greater Toronto Area bounding boxes. The tables below display the specified classes, their corresponding mapillary label(s) and (optionally) a description.

To see the raw `.txt` file of all classes, view `classes.txt`
To see the raw `.txt` file of all labels, view `all_labels.txt`

## Regulatory

| Class                         | Mapillary Label(s)                            | Description                                             |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| yield                         | regulatory--yield--g1                         |                                                         |
| stop-en                       | regulatory--stop--g1, regulatory--stop--g10   | English version of stop sign                            |
| stop-fr                       | regulatory--stop--g1, regulatory--stop--g10   | French version of stop sign                             |
| speed_limit_20                | regulatory--maximum-speed-limit-20--g3        |                                                         |
| speed_limit_30                | regulatory--maximum-speed-limit-30--g3        |                                                         |
| speed_limit_40                | regulatory--maximum-speed-limit-40--g3        |                                                         |
| speed_limit_50                | regulatory--maximum-speed-limit-50--g3        |                                                         |
| speed_limit_60                | regulatory--maximum-speed-limit-60--g3        |                                                         |
| speed_limit_70                | regulatory--maximum-speed-limit-70--g3        |                                                         |
| speed_limit_80                | regulatory--maximum-speed-limit-80--g3        |                                                         |
| speed_limit_90                | regulatory--maximum-speed-limit-90--g3        |                                                         |
| speed_limit_100               | regulatory--maximum-speed-limit-100--g3       |                                                         |
| no_entry                      | regulatory--no-entry--g1                      |                                                         |
| no_parking\*                  | regulatory--no-parking--g[2,9]                | Grouping due to similarity (\*verify with label-studio) |
| no_stopping                   | regulatory--no-stopping--g3                   |                                                         |
| no_pedestrians                | regulatory--no-pedestrians--g2                |                                                         |
| no_bicycles                   | regulatory--no-bicycles--g2                   |                                                         |
| no_pedestrians_or_bicycles    | regulatory--no-pedestrians-or-bicycles--g2    |                                                         |
| no_trucks                     | regulatory--no-heavy-goods-vehicles--g1       |                                                         |
| no_buses                      | regulatory--no-buses--g1                      |                                                         |
| no_right_turn\*               | regulatory--no-right-turn--g[1-2]             | Grouping due to similarity (\*verify with label-studio) |
| no_left_turn\*                | regulatory--no-left-turn--g[1-2]              | Grouping due to similarity (\*verify with label-studio) |
| no_right_turn_on_red          | regulatory--no-right-turn-on-red--g1          |                                                         |
| no_u_turn                     | regulatory--no-u-turn--g1                     |                                                         |
| one_way_left\*                | regulatory--one-way-left--g[1,3]              | Grouping due to similarity (\*verify with label-studio) |
| one_way_right\*               | regulatory--one-way-right--g[1,3]             | Grouping due to similarity (\*verify with label-studio) |
| one_way_straight              | regulatory--one-way-straight--g3              |                                                         |
| no_straight_through           | regulatory--no-straight-through--g2           |                                                         |
| keep_right                    | regulatory--keep-right--g4                    |                                                         |
| parking_restriction           | regulatory--parking-restrictions--g1          |                                                         |
| go_straight_or_turn_left\*    | regulatory--go-straight-or-turn-left--g[1-3]  | Grouping due to similarity (\*verify with label-studio) |
| go_straight_or_turn_right\*   | regulatory--go-straight-or-turn-right--g[1-3] | Grouping due to similarity (\*verify with label-studio) |
| turn_left_ahead\*             | regulatory--turn-left-ahead--g[1,2]           | Grouping due to similarity (\*verify with label-studio) |
| turn_right_ahead\*            | regulatory--turn-right-ahead--g[1,2]          | Grouping due to similarity (\*verify with label-studio) |
| end_of_speed_limit            | regulatory--end-of-maximum-speed-limit--g1    |                                                         |
| go_straight_or_turn_right     | regulatory--go-straight-or-turn-right--g2     |                                                         |
| end_of_no_parking_or_stopping | regulatory--end-of-no-parking-or-stopping--g1 |                                                         |

## Information

| Class               | Mapillary Label(s)                   | Description                                             |
| ------------------- | ------------------------------------ | ------------------------------------------------------- |
| general_directions  | information--general-directions--g1  |                                                         |
| highway_exit        | information--highway-exit--g1        |                                                         |
| highway_interchange | information--highway-interchange--g1 |                                                         |
| parking\*           | information--parking--g[1-6]         | Grouping due to similarity (\*verify with label-studio) |
| disabled_persons    | information--disabled-persons--g1    |                                                         |
| hospital            | information--hospital--g1            |                                                         |
| bike_route\*        | information--bike-route--g[1,2]      | Grouping due to similarity (\*verify with label-studio) |
| gas_station         | information--gas-station--g1         |                                                         |

## Warning

| Class               | Mapillary Label(s)              | Description |
| ------------------- | ------------------------------ | ----------- |
| road_narrows_right  | warning--road-narrows-right--g2 |             |
| road_narrows_left                      | warning--road-narrows-left--g2                                             |                                                         |
| bicycles_crossing                      | warning--bicycles-crossing--g2                                             |                                                         |
| children                               | warning--children--g2                                                      |                                                         |
| crossroads                             | warning--crossroads--g3                                                    |                                                         |
| construction_ahead                     | warning--detour-or-construction-ahead--g1, warning--construction-ahead--g1 |                                                         |
| curve_left                             | warning--curve-left--g2                                                    |                                                         |
| curve_right                            | warning--curve-right--g2                                                   |                                                         |
| deer_crossing                          | warning--wild-animals--g4                                                  |                                                         |
| uneven_road                            | warning--uneven-road--g2                                                   |                                                         |
| turn_left_warning                      | warning--turn-right--g1                                                    |                                                         |
| turn_left_construction                 | warning--turn-right--g3                                                    |                                                         |
| turn_right_warning                     | warning--turn-right--g1                                                    |
| turn_right_construction                | warning--turn-right--g3                                                    |                                                         |
| trucks_rollover\*                      | warning--trucks-rollover--g[1-5]                                           | Grouping due to similarity (\*verify with label-studio) |
| trucks_crossing                        | warning--trucks-crossing--g2                                               |                                                         |
| traffic_signal_warning                 | warning--traffic-signals--g3                                               |                                                         |
| traffic_merges_left                    | warning--traffic-merges-left--g1                                           |                                                         |
| traffic_merges_right                   | warning--traffic-merges-right--g1                                          |                                                         |
| text_warning\*                         | warning--texts--g[1-3]                                                     |                                                         | Grouping due to similarity (\*verify with label-studio) |
| stop_ahead                             | warning--stop-ahead--g1                                                    |                                                         |
| t_junction                             | warning--t-roads--g2                                                       |                                                         |
| slippery_road                          | warning--slippery-road-surface--g2                                         |                                                         |
| school_zone                            | warning--school-zone--g2                                                   |                                                         |
| roadworks                              | warning--roadworks--g5                                                     |                                                         |
| roundabout                             | warning--roundabout--g2                                                    |                                                         |
| shared_lane                            | warning--shared-lane-motorcycles-bicycles--g1                              |                                                         |
| road_narrows_left                      | warning--road-narrows-left--g2                                             |                                                         |
| road_narrows_right                     | warning--road-narrows-right--g2                                            |                                                         |
| speed_bump_ahead\*                     | warning--road-bump--g[2,3]                                                 | Grouping due to similarity (\*verify with label-studio) |
| reduced_speed_limit                    | warning--reduced-maximum-speed-limit--g1                                   |                                                         |
| railroad_intersection                  | warning--railroad-intersection--g6                                         |                                                         |
| railroad_crossing                      | warning--railroad-crossing--g2                                             |                                                         |
| playground                             | warning--playground--g1                                                    |                                                         |
| pedestrian_crossing                    | warning--pedestrians-crossing--g4                                          |                                                         |
| side_road_right                        | warning--junction-with-a-side-road-perpendicular-right--g3                 |                                                         |
| side_road_left                         | warning--junction-with-a-side-road-perpendicular-left--g3                  |                                                         |
| height_restriction                     | warning--height-restriction--g2                                            |                                                         |
| dead_end                               | warning--dead-end--g2                                                      |                                                         |
| cars_and_motorcycles                   | warning--vehicles-and-others--g1                                           |                                                         |
| added_lane_right                       | warning--added-lane-right--g1                                              |                                                         |
| added_lane_left                        | warning--added-lane-left--g1                                               |                                                         |
| reserved_lane                          | warning--reserved-lane--g1                                                 |                                                         |
| junction_side_road_perpendicular_left  | warning--junction-with-a-side-road-perpendicular-left--g4                  |                                                         |
| junction_side_road_perpendicular_right | warning--junction-with-a-side-road-perpendicular-right--g4                 |                                                         |
| double_curve_first_left                | warning--double-curve-first-left--g2                                       |                                                         |
| double_curve_first_right               | warning--double-curve-first-right--g2                                      |                                                         |
| trail_crossing                         | warning--trail-crossing--g1                                                |                                                         |
| dual_lanes_right_turn_or_go_straight   | warning--dual-lanes-right-turn-or-go-straight--g1                          |                                                         |
| dual_lanes_right_turn_or_go_straight   | warning--dual-lanes-right-turn-or-go-straight--g1                          | _~700 entries_                                          |

## Complementary

| Class                       | Mapillary Label(s)                        | Description                                             |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| obstacle_delineator         | complementary--obstacle-delineator--g1    |                                                         |
| obstacle_delineator_left    | complementary--obstacle-delineator--g2    |                                                         |
| obstacle_delineator_right   | complementary--obstacle-delineator--g3    |                                                         |
| chevron_left\*              | complementary--chevron-left--g[1-5]       | Grouping due to similarity (\*verify with label-studio) |
| chevron_right\*             | complementary--chevron-right--g[1-5]      | Grouping due to similarity (\*verify with label-studio) |
| complementary_keep_left     | complementary--keep-left--g1              |                                                         |
| complementary_keep_right    | complementary--keep-right--g1             |                                                         |
| detour                      | complementary--detour--g1                 |                                                         |
| construction_speed_limit_30 | complementary--maximum-speed-limit-30--g1 |                                                         |
| construction_speed_limit_40 | complementary--maximum-speed-limit-40--g1 |                                                         |
| construction_speed_limit_50 | complementary--maximum-speed-limit-50--g1 |                                                         |
| construction_speed_limit_60 | complementary--maximum-speed-limit-60--g1 |                                                         |
| construction_speed_limit_80 | complementary--maximum-speed-limit-80--g1 |                                                         |
