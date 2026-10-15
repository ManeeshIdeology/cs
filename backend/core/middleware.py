from django.middleware.gzip import GZipMiddleware


class GZipForReadsMiddleware(GZipMiddleware):
    """Compress GET responses (lists, print pages, CSV) but not the echo of a POST/PATCH.

    Autosave answers carry the whole note back; compressing ~50 KB on every keystroke-pause costs more CPU than it saves.
    """

    def process_response(self, request, response):
        if request.method != "GET":
            return response
        return super().process_response(request, response)
