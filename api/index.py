import os
import sys
from pathlib import Path

# Add project root and backend_django to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'backend_django'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_django.settings')

# Import Django WSGI application
from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()
