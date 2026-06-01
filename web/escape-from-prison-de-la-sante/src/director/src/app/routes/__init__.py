from .dashboard import bp as dashboard_bp
from .personnel import bp as personnel_bp
from .budget import bp as budget_bp
from .reports import bp as reports_bp
from .permissions import bp as permissions_bp
from .blocs import bp as blocs_bp
from .solitary import bp as solitary_bp
from .audit import bp as audit_bp
from .settings import bp as settings_bp


def register_routes(app):
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(personnel_bp, url_prefix='/personnel')
    app.register_blueprint(budget_bp, url_prefix='/budget')
    app.register_blueprint(reports_bp, url_prefix='/rapports')
    app.register_blueprint(permissions_bp, url_prefix='/permissions')
    app.register_blueprint(blocs_bp, url_prefix='/blocs')
    app.register_blueprint(solitary_bp, url_prefix='/detenus')
    app.register_blueprint(audit_bp, url_prefix='/audit')
    app.register_blueprint(settings_bp, url_prefix='/parametres')
