"""Geographic helpers for geofence alerting (haversine distance)."""

import math


def haversine_meters(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    """Great-circle distance in meters between two WGS-84 points.

    Uses the haversine formula; accurate enough for geofence radii in the
    50 m – 2 km range handled by Sahāy.
    """
    earth_radius_m = 6_371_000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_m * c


def is_inside_zone(
    lat: float,
    lng: float,
    zone_lat: float,
    zone_lng: float,
    radius_meters: float,
) -> tuple[bool, float]:
    """Return (is_inside, distance_from_zone_center_m)."""
    distance = haversine_meters(lat, lng, zone_lat, zone_lng)
    return distance <= radius_meters, distance