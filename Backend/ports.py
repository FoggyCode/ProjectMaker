import socket
def find_free_port():
    # Öffnet einen temporären Socket, der automatisch einen freien Port findet
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))  # 0 bedeutet "nimm irgendeinen freien Port"
    port = s.getsockname()[1]
    s.close()
    return port
