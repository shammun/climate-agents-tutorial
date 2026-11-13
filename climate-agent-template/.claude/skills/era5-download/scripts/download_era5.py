"""Download ERA5 single-level data from the Copernicus Climate Data Store, one file per year.

Example:
    python download_era5.py --variable 2m_temperature --start 1991 --end 2024 \
        --area 39.5 -83.7 36.5 -75.2 --name virginia --outdir data/raw/era5

Needs: pip install cdsapi, and a ~/.cdsapirc file with your CDS url and key.
"""
import argparse
from pathlib import Path

MONTHS = [f"{m:02d}" for m in range(1, 13)]
DAYS = [f"{d:02d}" for d in range(1, 32)]
HOURS = [f"{h:02d}:00" for h in range(24)]


def build_request(variable, year, area, hourly):
    request = {
        "variable": [variable],
        "year": [str(year)],
        "month": MONTHS,
        "area": area,  # North, West, South, East
        "data_format": "netcdf",
        "download_format": "unarchived",
    }
    if hourly:
        dataset = "reanalysis-era5-single-levels"
        request.update(product_type=["reanalysis"], day=DAYS, time=HOURS)
    else:
        dataset = "reanalysis-era5-single-levels-monthly-means"
        request.update(product_type=["monthly_averaged_reanalysis"], time=["00:00"])
    return dataset, request


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--variable", required=True, help="CDS variable name, e.g. 2m_temperature")
    parser.add_argument("--start", type=int, required=True, help="first year")
    parser.add_argument("--end", type=int, required=True, help="last year (inclusive)")
    parser.add_argument("--area", type=float, nargs=4, required=True, metavar=("N", "W", "S", "E"))
    parser.add_argument("--name", required=True, help="short region name used in file names")
    parser.add_argument("--outdir", default="data/raw/era5")
    parser.add_argument("--hourly", action="store_true", help="hourly data instead of monthly means")
    args = parser.parse_args()

    import cdsapi  # imported here so --help works without cdsapi installed

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client()
    kind = "hourly" if args.hourly else "monthly"

    for year in range(args.start, args.end + 1):
        target = outdir / f"era5-{kind}_{args.variable}_{args.name}_{year}.nc"
        if target.exists():
            print(f"skip {target} (exists)")
            continue
        dataset, request = build_request(args.variable, year, args.area, args.hourly)
        print(f"request {dataset} {year} -> {target}")
        client.retrieve(dataset, request, str(target))


if __name__ == "__main__":
    main()
