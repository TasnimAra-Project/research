"""Build src/data/seed.json and supabase/seed.sql from the source-document data."""

from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from foods_data import FOODS
from recipes_data import RECIPES
from recipes_rest import MORE_RECIPES
from superfoods_data import NUTRIENT_ROLES, SUPERFOODS, WHY_NOTE
from urls import LENTIL_VIDEO, QUINOA_VIDEO

ROOT = Path(__file__).resolve().parents[1]
NS = uuid.UUID("8c2e1b7a-4f3d-5e6c-9a1b-2d3e4f506172")
ALL_RECIPES = RECIPES + MORE_RECIPES


def uid(kind: str, slug: str) -> str:
    return str(uuid.uuid5(NS, f"{kind}:{slug}"))


def dq(value) -> str:
    if value is None:
        return "null"
    text = str(value)
    tag = "few"
    while f"${tag}$" in text:
        tag += "x"
    return f"${tag}${text}${tag}$"


def text_array(items) -> str:
    if not items:
        return "'{}'::text[]"
    return "array[" + ",".join(dq(item) for item in items) + "]::text[]"


def enum_array(items, enum_name: str) -> str:
    if not items:
        return f"'{{}}'::{enum_name}[]"
    return "array[" + ",".join(f"{dq(item)}::{enum_name}" for item in items) + "]"


def jsonb(value) -> str:
    return dq(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def sql_bool(value) -> str:
    if value is None:
        return "null"
    return "true" if value else "false"


def sql_num(value) -> str:
    if value is None:
        return "null"
    return str(value)


def validate() -> None:
    slugs = [recipe["slug"] for recipe in ALL_RECIPES]
    if len(ALL_RECIPES) != 25:
        raise SystemExit(f"Expected 25 recipes, found {len(ALL_RECIPES)}")
    if len(slugs) != len(set(slugs)):
        raise SystemExit("Duplicate recipe slug")

    for slug, food in FOODS.items():
        verdict = food.get("verdict", "unknown")
        if verdict not in {"unknown", "okay", "okay_if_prepared", "limit", "avoid"}:
            raise SystemExit(f"{slug} has an unknown verdict {verdict}")
        if verdict != "unknown":
            if not food.get("reason") or not food.get("source_name") or not food.get("source_url"):
                raise SystemExit(f"{slug} verdict needs a reason, source name, and source URL")
            if not str(food["source_url"]).startswith("https://"):
                raise SystemExit(f"{slug} source URL must be https")
        if verdict == "okay_if_prepared" and not food.get("safe_version"):
            raise SystemExit(f"{slug} is missing a safe version")

    ranks = [item["best_value_rank"] for item in SUPERFOODS if item["best_value_rank"]]
    if sorted(ranks) != [1, 2, 3, 4, 5, 6, 7, 8]:
        raise SystemExit(f"Best-value ranks are {ranks}")

    for recipe in ALL_RECIPES:
        if recipe["meal"] not in recipe["meals"]:
            raise SystemExit(f"{recipe['slug']} primary meal is missing from meals")
        for ingredient in recipe["ingredients"]:
            for key in ("food_slug", "alternate_food_slug"):
                food_slug = ingredient.get(key)
                if food_slug and food_slug not in FOODS:
                    raise SystemExit(f"{recipe['slug']} missing food {food_slug}")
        for link in recipe["evidence"]:
            if not link["url"].startswith("https://"):
                raise SystemExit(f"Bad evidence URL in {recipe['slug']}")
        for tag in recipe["effort_tags"]:
            if tag not in {"no-cook", "one-pot", "sheet-pan", "make-ahead"}:
                raise SystemExit(tag)
        for tag in recipe["diet_tags"]:
            if tag not in {"vegetarian", "vegan", "pescatarian", "gluten-free option"}:
                raise SystemExit(tag)

    for item in SUPERFOODS:
        if item["food_slug"] and item["food_slug"] not in FOODS:
            raise SystemExit(f"Superfood {item['slug']} missing food {item['food_slug']}")


def recipe_json(recipe: dict) -> dict:
    body = {key: value for key, value in recipe.items() if key != "evidence"}
    body["evidence_links"] = [
        {"label": link["label"], "url": link["url"]} for link in recipe["evidence"]
    ]
    body["wic_friendly"] = None
    body["stage"] = "both"
    body["cost_store"] = None
    body["cost_checked_date"] = None
    body["photo_url"] = None
    body["reviewed_by"] = None
    body["reviewed_date"] = None
    body["source_document"] = "25 recipes.pdf"
    body["total_cost"] = float(recipe["total_cost"])
    return body


def resources() -> list[dict]:
    rows = [
        {
            "category": "video",
            "title": "Lentils",
            "description": "A straightforward lentil preparation that works well for learning how to cook lentils before adding them to bowls, soups, or other recipes.",
            "url": LENTIL_VIDEO,
            "recipe_slug": None,
        },
        {
            "category": "video",
            "title": "Quinoa",
            "description": "This one is especially good because it shows rinsing, water-to-quinoa ratio, stovetop cooking, avoiding mushy quinoa, and storage.",
            "url": QUINOA_VIDEO,
            "recipe_slug": None,
        },
    ]
    for recipe in ALL_RECIPES:
        for link in recipe["evidence"]:
            rows.append(
                {
                    "category": "evidence",
                    "title": link["label"],
                    "description": link["description"],
                    "url": link["url"],
                    "recipe_slug": recipe["slug"],
                }
            )
    return rows


def build_sql() -> str:
    lines = [
        "-- Generated by scripts/build_seed.py. Edit the Python sources, then regenerate.",
        "-- Recipe text: 25 recipes.pdf. Evidence also includes Resources.pdf.",
        "-- Superfoods: Superfoods table.pdf and Superfood list.pdf.",
        "-- Safety verdicts are unknown unless a source sentence states one.",
        "begin;",
    ]

    for slug, food in FOODS.items():
        food_id = uid("food", slug)
        lines.append(
            "insert into public.foods (id, slug, name, aliases, preparation, verdict, reason, safe_version, source_name, source_url) values ("
            + ", ".join(
                [
                    dq(food_id),
                    dq(slug),
                    dq(food["name"]),
                    text_array(food.get("aliases") or []),
                    dq(food.get("preparation")),
                    dq(food.get("verdict", "unknown")) + "::public.safety_verdict",
                    dq(food.get("reason")),
                    dq(food.get("safe_version")),
                    dq(food.get("source_name")),
                    dq(food.get("source_url")),
                ]
            )
            + ");"
        )

    for recipe in ALL_RECIPES:
        recipe_id = uid("recipe", recipe["slug"])
        evidence = [{"label": link["label"], "url": link["url"]} for link in recipe["evidence"]]
        lines.append(
            "insert into public.recipes (id, slug, title, description, meal, meals, servings, servings_label, prep_min, cook_min, total_min, inactive_time_note, total_cost, cost_is_approximate, cost_store, cost_checked_date, effort_tags, diet_tags, wic_friendly, stage, chef_tips, superfood_spotlight, nutrition_highlights, benefits, evidence_links, photo_url, reviewed_by, reviewed_date, safety_note, source_document) values ("
            + ", ".join(
                [
                    dq(recipe_id),
                    dq(recipe["slug"]),
                    dq(recipe["title"]),
                    dq(recipe["description"]),
                    dq(recipe["meal"]) + "::public.meal_type",
                    enum_array(recipe["meals"], "public.meal_type"),
                    str(recipe["servings"]),
                    dq(recipe["servings_label"]),
                    str(recipe["prep_min"]),
                    str(recipe["cook_min"]),
                    str(recipe["total_min"]),
                    dq(recipe["inactive_time_note"]),
                    recipe["total_cost"],
                    sql_bool(recipe["cost_is_approximate"]),
                    "null",
                    "null",
                    enum_array(recipe["effort_tags"], "public.effort_tag"),
                    enum_array(recipe["diet_tags"], "public.diet_tag"),
                    "null",
                    "'both'::public.stage_type",
                    text_array(recipe["chef_tips"]),
                    dq(recipe["superfood_spotlight"]),
                    text_array(recipe["nutrition_highlights"]),
                    text_array(recipe["benefits"]),
                    jsonb(evidence),
                    "null",
                    "null",
                    "null",
                    dq(recipe["safety_note"]),
                    dq("25 recipes.pdf"),
                ]
            )
            + ");"
        )
        for position, ingredient in enumerate(recipe["ingredients"], start=1):
            food_slug = ingredient["food_slug"]
            alt = ingredient["alternate_food_slug"]
            lines.append(
                "insert into public.recipe_ingredients (recipe_id, position, amount, unit, item, optional, food_id, alternate_food_id, display) values ("
                + ", ".join(
                    [
                        dq(recipe_id),
                        str(position),
                        sql_num(ingredient["amount"]),
                        dq(ingredient["unit"]),
                        dq(ingredient["item"]),
                        sql_bool(ingredient["optional"]),
                        dq(uid("food", food_slug)) if food_slug else "null",
                        dq(uid("food", alt)) if alt else "null",
                        dq(ingredient["display"]),
                    ]
                )
                + ");"
            )
        for order, step in enumerate(recipe["steps"], start=1):
            lines.append(
                "insert into public.recipe_steps (recipe_id, step_order, text, timer_seconds) values ("
                + ", ".join(
                    [
                        dq(recipe_id),
                        str(order),
                        dq(step["text"]),
                        sql_num(step["timer_seconds"]),
                    ]
                )
                + ");"
            )

    for item in SUPERFOODS:
        lines.append(
            "insert into public.superfoods (id, slug, name, group_name, food_id, key_nutrients, meal_ideas, nutrition_per_100g, nutrition_state, benefits, prices, difficulty, best_value_rank, best_value_label, best_value_reason, source_documents) values ("
            + ", ".join(
                [
                    dq(uid("superfood", item["slug"])),
                    dq(item["slug"]),
                    dq(item["name"]),
                    dq(item["group_name"]),
                    dq(uid("food", item["food_slug"])) if item["food_slug"] else "null",
                    dq(item["key_nutrients"]),
                    dq(item["meal_ideas"]),
                    jsonb(item["nutrition_per_100g"]) if item["nutrition_per_100g"] else "null",
                    dq(item["nutrition_state"]),
                    dq(item["benefits"]),
                    jsonb(item["prices"]),
                    dq(item["difficulty"]),
                    sql_num(item["best_value_rank"]),
                    dq(item["best_value_label"]),
                    dq(item["best_value_reason"]),
                    text_array(item["source_documents"]),
                ]
            )
            + ");"
        )

    for resource in resources():
        lines.append(
            "insert into public.resources (category, title, description, url, recipe_slug) values ("
            + ", ".join(
                [
                    dq(resource["category"]),
                    dq(resource["title"]),
                    dq(resource["description"]),
                    dq(resource["url"]),
                    dq(resource["recipe_slug"]),
                ]
            )
            + ");"
        )

    for nutrient, examples in NUTRIENT_ROLES:
        lines.append(
            "insert into public.nutrient_roles (nutrient, food_examples, source_note) values ("
            + ", ".join([dq(nutrient), dq(examples), dq(WHY_NOTE)])
            + ");"
        )

    lines.append("commit;")
    return "\n".join(lines) + "\n"


def main() -> None:
    validate()
    payload = {
        "foods": [
            {
                "slug": slug,
                "name": food["name"],
                "aliases": food.get("aliases") or [],
                "preparation": food.get("preparation"),
                "verdict": food.get("verdict", "unknown"),
                "reason": food.get("reason"),
                "safe_version": food.get("safe_version"),
                "source_name": food.get("source_name"),
                "source_url": food.get("source_url"),
            }
            for slug, food in FOODS.items()
        ],
        "recipes": [recipe_json(recipe) for recipe in ALL_RECIPES],
        "superfoods": SUPERFOODS,
        "resources": resources(),
        "nutrient_roles": [
            {"nutrient": nutrient, "food_examples": examples, "source_note": WHY_NOTE}
            for nutrient, examples in NUTRIENT_ROLES
        ],
    }
    data_path = ROOT / "src" / "data" / "seed.json"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "supabase" / "seed.sql").write_text(build_sql(), encoding="utf-8")
    print(
        f"recipes={len(payload['recipes'])} foods={len(payload['foods'])} "
        f"superfoods={len(payload['superfoods'])} resources={len(payload['resources'])}"
    )


if __name__ == "__main__":
    main()
