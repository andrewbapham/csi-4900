"""
Mapillary label to class name mapping dictionary.

This file contains a comprehensive mapping from Mapillary traffic sign labels
to their corresponding class names as defined in the README.md file.

Usage:
    from label_to_class_mapping import LABEL_TO_CLASS
    
    class_name = LABEL_TO_CLASS.get('regulatory--yield--g1', 'unknown')
"""

# Dictionary mapping Mapillary labels to class names
LABEL_TO_CLASS = {
    # Regulatory signs
    'regulatory--yield--g1': 'yield',
    'regulatory--stop--g1': 'stop-en',
    'regulatory--maximum-speed-limit-20--g3': 'speed_limit_20',
    'regulatory--maximum-speed-limit-30--g3': 'speed_limit_30',
    'regulatory--maximum-speed-limit-40--g3': 'speed_limit_40',
    'regulatory--maximum-speed-limit-50--g3': 'speed_limit_50',
    'regulatory--maximum-speed-limit-60--g3': 'speed_limit_60',
    'regulatory--maximum-speed-limit-70--g3': 'speed_limit_70',
    'regulatory--maximum-speed-limit-80--g3': 'speed_limit_80',
    'regulatory--maximum-speed-limit-90--g3': 'speed_limit_90',
    'regulatory--maximum-speed-limit-100--g3': 'speed_limit_100',
    'regulatory--no-entry--g1': 'no_entry',
    'regulatory--no-parking--g2': 'no_parking',
    'regulatory--no-stopping--g3': 'no_stopping',
    'regulatory--no-pedestrians--g2': 'no_pedestrians',
    'regulatory--no-bicycles--g2': 'no_bicycles',
    'regulatory--no-pedestrians-or-bicycles--g2': 'no_pedestrians_or_bicycles',
    'regulatory--no-heavy-goods-vehicles--g1': 'no_trucks',
    'regulatory--no-buses--g1': 'no_buses',
    'regulatory--no-right-turn--g1': 'no_right_turn',
    'regulatory--no-left-turn--g2': 'no_left_turn',
    'regulatory--no-right-turn-on-red--g1': 'no_right_turn_on_red',
    'regulatory--no-u-turn--g1': 'no_u_turn',
    'regulatory--one-way-left--g3': 'one_way_left',
    'regulatory--one-way-right--g1': 'one_way_right',
    'regulatory--one-way-straight--g3': 'one_way_straight',
    'regulatory--no-straight-through--g2': 'no_straight_through',
    'regulatory--keep-right--g4': 'keep_right',
    'regulatory--parking-restrictions--g1': 'parking_restriction',
    'regulatory--go-straight-or-turn-left--g3': 'go_straight_or_turn_left',
    'regulatory--go-straight-or-turn-right--g3': 'go_straight_or_turn_right',
    'regulatory--turn-left-ahead--g1': 'turn_left_ahead',
    'regulatory--turn-right-ahead--g1': 'turn_right_ahead',
    'regulatory--end-of-maximum-speed-limit--g1': 'end_of_speed_limit',
    'regulatory--end-of-no-parking-or-stopping--g1': 'end_of_no_parking_or_stopping',
    
    # Information signs
    'information--general-directions--g1': 'general_directions',
    'information--highway-exit--g1': 'highway_exit',
    'information--highway-interchange--g1': 'highway_interchange',
    'information--parking--g1': 'parking',
    'information--disabled-persons--g1': 'disabled_persons',
    'information--hospital--g1': 'hospital',
    'information--bike-route--g1': 'bike_route',
    'information--gas-station--g1': 'gas_station',
    
    # Warning signs
    'warning--road-narrows-right--g2': 'road_narrows_right',
    'warning--road-narrows-left--g2': 'road_narrows_left',
    'warning--bicycles-crossing--g2': 'bicycles_crossing',
    'warning--children--g2': 'children',
    'warning--crossroads--g3': 'crossroads',
    'warning--detour-or-construction-ahead--g1': 'construction_ahead',
    'warning--construction-ahead--g1': 'construction_ahead',
    'warning--curve-left--g2': 'curve_left',
    'warning--curve-right--g2': 'curve_right',
    'warning--wild-animals--g4': 'deer_crossing',
    'warning--uneven-road--g2': 'uneven_road',
    'warning--turn-right--g1': 'turn_left_warning', 
    'warning--turn-right--g3': 'turn_left_construction',
    'warning--turn-right--g1': 'turn_right_warning',
    'warning--turn-right--g3': 'turn_right_construction',
    'warning--trucks-rollover--g2': 'trucks_rollover',
    'warning--trucks-crossing--g2': 'trucks_crossing',
    'warning--traffic-signals--g3': 'traffic_signal_warning',
    'warning--traffic-merges-left--g1': 'traffic_merges_left',
    'warning--traffic-merges-right--g1': 'traffic_merges_right',
    'warning--texts--g1': 'text_warning',
    'warning--stop-ahead--g1': 'stop_ahead',
    'warning--t-roads--g2': 't_junction',
    'warning--slippery-road-surface--g2': 'slippery_road',
    'warning--school-zone--g2': 'school_zone',
    'warning--roadworks--g5': 'roadworks',
    'warning--roundabout--g2': 'roundabout',
    'warning--shared-lane-motorcycles-bicycles--g1': 'shared_lane',
    'warning--road-bump--g2': 'speed_bump_ahead',
    'warning--reduced-maximum-speed-limit--g1': 'reduced_speed_limit',
    'warning--railroad-intersection--g6': 'railroad_intersection',
    'warning--railroad-crossing--g2': 'railroad_crossing',
    'warning--playground--g1': 'playground',
    'warning--pedestrians-crossing--g4': 'pedestrian_crossing',
    'warning--junction-with-a-side-road-perpendicular-right--g3': 'side_road_right',
    'warning--junction-with-a-side-road-perpendicular-left--g3': 'side_road_left',
    'warning--height-restriction--g2': 'height_restriction',
    'warning--dead-end--g2': 'dead_end',
    'warning--vehicles-and-others--g1': 'cars_and_motorcycles',
    'warning--added-lane-right--g1': 'added_lane_right',
    'warning--added-lane-left--g1': 'added_lane_left',
    'warning--reserved-lane--g1': 'reserved_lane',
    'warning--junction-with-a-side-road-perpendicular-left--g4': 'junction_side_road_perpendicular_left',
    'warning--junction-with-a-side-road-perpendicular-right--g4': 'junction_side_road_perpendicular_right',
    'warning--double-curve-first-left--g2': 'double_curve_first_left',
    'warning--double-curve-first-right--g2': 'double_curve_first_right',
    'warning--trail-crossing--g1': 'trail_crossing',
    'warning--dual-lanes-right-turn-or-go-straight--g1': 'dual_lanes_right_turn_or_go_straight',
    
    # Complementary signs
    'complementary--obstacle-delineator--g1': 'obstacle_delineator',
    'complementary--obstacle-delineator--g2': 'obstacle_delineator_left',
    'complementary--obstacle-delineator--g3': 'obstacle_delineator_right',
    'complementary--chevron-left--g1': 'chevron_left',
    'complementary--chevron-right--g1': 'chevron_right',
    'complementary--keep-left--g1': 'complementary_keep_left',
    'complementary--keep-right--g1': 'complementary_keep_right',
    'complementary--detour--g1': 'detour',
    'complementary--maximum-speed-limit-30--g1': 'construction_speed_limit_30',
    'complementary--maximum-speed-limit-40--g1': 'construction_speed_limit_40',
    'complementary--maximum-speed-limit-50--g1': 'construction_speed_limit_50',
    'complementary--maximum-speed-limit-60--g1': 'construction_speed_limit_60',
    'complementary--maximum-speed-limit-80--g1': 'construction_speed_limit_80',
}

# Helper function to get class name from mapillary label
def get_class_name(mapillary_label):
    """
    Get the class name for a given mapillary label.
    
    Args:
        mapillary_label (str): The mapillary label to look up
        
    Returns:
        str: The corresponding class name, or 'unknown' if not found
    """
    return LABEL_TO_CLASS.get(mapillary_label, 'unknown')

# Helper function to get all available class names
def get_all_class_names():
    """
    Get all unique class names in the mapping.
    
    Returns:
        set: Set of all unique class names
    """
    return set(LABEL_TO_CLASS.values())

# Helper function to get all mapillary labels for a class
def get_labels_for_class(class_name):
    """
    Get all mapillary labels that map to a given class name.
    
    Args:
        class_name (str): The class name to look up
        
    Returns:
        list: List of mapillary labels that map to the class name
    """
    return [label for label, cls in LABEL_TO_CLASS.items() if cls == class_name]

if __name__ == "__main__":
    # Example usage
    print(f"Total mappings: {len(LABEL_TO_CLASS)}")
    print(f"Unique classes: {len(get_all_class_names())}")
    print(f"Example mapping: 'regulatory--yield--g1' -> '{get_class_name('regulatory--yield--g1')}'")