.PHONY: reproduce test schemas boundary attacks evidence manifest formal prepublish-ready prepublish clean

reproduce:
	cd protocol/FRP-2.0.0-draft.1 && ./reproduce.sh

schemas:
	python3 tools/validate_schemas.py

boundary:
	python3 tools/check_boundary.py

attacks:
	node --experimental-strip-types break-finality/harness/run-attacks.mts

evidence:
	python3 tools/build_scoreboard.py --records evidence/records --output evidence/scoreboard.json --check

formal:
	python3 protocol/FRP-2.0.0-draft.1/formal/model_check.py

manifest:
	python3 tools/generate_infrastructure_manifest.py --check

test: reproduce schemas boundary attacks evidence manifest
	python3 -m unittest discover -s tests -v

clean:
	rm -rf artifacts/test-output

prepublish-ready:
	python3 tools/prepublish_check.py

prepublish:
	python3 tools/prepublish_check.py --publish
