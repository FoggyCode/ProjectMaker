def get_last_modified(path):

    try:
        timestamp = os.path.getmtime(path)
        return datetime.fromtimestamp(timestamp)
    except FileNotFoundError:
        return None