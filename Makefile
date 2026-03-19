.PHONY: test test-cov test-auth test-ai test-admin test-middleware test-security

# Run full test suite with short tracebacks
test:
	pytest tests/ -v --tb=short

# Run full suite with coverage report
test-cov:
	pytest tests/ --cov=app --cov-report=term-missing

# Run individual test modules
test-auth:
	pytest tests/test_auth.py -v

test-ai:
	pytest tests/test_ai.py -v

test-admin:
	pytest tests/test_admin.py -v

test-middleware:
	pytest tests/test_middleware.py -v

test-security:
	pytest tests/test_security.py -v
