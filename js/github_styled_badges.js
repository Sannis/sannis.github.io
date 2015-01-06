
if (!Array.prototype.some) {
  Array.prototype.some = function (el) {
    for (var i = 0, len = this.length; i < len; i++) {
      if (this[i] == el) {
        return true;
      }
    }
    return false;
  };
}


var GithubStyledBadges = {};

GithubStyledBadges._cache = {};
GithubStyledBadges._callbacks = {};

GithubStyledBadges.load = function (type, args, callback)  {
  var cache_level;
  var cache_key;
  var api_url;
  var api_base_url = "http://api.github.com";
  
  cache_level = type;
  
  if (type == "reposShow") {
    cache_key = args.user;
    api_url = api_base_url + "/users/" + args.user + "/repos";
  } else if (type == "reposWatched") {
    cache_key = args.user;
    api_url = api_base_url + "/users/" + args.user + "/subscriptions";
    
    var real_callback = callback;
    
    callback = function (watched) {
      GithubStyledBadges.load("reposShow", args, function (repos) {
        var watched_exclude_owned = {repositories: []};
        
        watched_exclude_owned.repositories = watched.repositories.filter(function(repo_watched) {
          return !repos.repositories.some(function (repo) {
            return repo.url == repo_watched.url;
          });
        });
        
        real_callback(watched_exclude_owned);
      });
    }
    
  }
  
  if (GithubStyledBadges._cache[cache_level] === undefined) {
    GithubStyledBadges._cache[cache_level] = {};
  }
  
  // From Nick Fitzgerald github.js
  var id = +new Date;
  while (GithubStyledBadges._callbacks[id] !== undefined) {
    id += Math.random();
  }
  
  if (GithubStyledBadges._cache[cache_level][cache_key] === undefined) {
    GithubStyledBadges._callbacks[id] = function (data) {
      if (GithubStyledBadges._callbacks[id]) {
        delete GithubStyledBadges._callbacks[id];
      }

      callback(data);
    };
    
    $.getScript(api_url + "?callback=" + encodeURIComponent("GithubStyledBadges._callbacks[" + id + "]"));
  } else {
    callback(GithubStyledBadges._cache[cache_level][cache_key]);
  }
};

GithubStyledBadges.ReposBadge = function(obj, user, repos_to_show, filter_loaded) {
  this.obj = $(obj);
  this.user = user;
  this.repos_to_show = repos_to_show || 5;
  this.filter_loaded = filter_loaded || function (repo) {
    return true;
  };
  this.title = $(obj).html();
  
  this.filters = {};
  
  this.filters['all'] = function(repo) {
    return true;
  };
  
  this.filters['source'] = function(repo) {
    return !repo.fork;
  };
  
  this.filters['fork'] = function(repo) {
    return repo.fork;
  };
  
  this.filter = this.filters['all'];
  
  this.render = function() {
    this.obj.empty();
    this.obj.addClass("repos");
    
    var top_bar = $("<div class='top_bar'><h2>" + this.title + "</h2></div>");
    this.obj.append(top_bar);
    
    var filter_bar = $("<div class='filter_bar'>" +
                         "<input type='search' class='filter_input native' placeholder='Find a repository&hellip;'>" +
                         "<ul class='repo_filterer'>" +
                           "<li class='all_repos'><a href='#' class='repo_filter' rel='all'>All Repositories</a></li>" +
                           "<li><a href='#' class='repo_filter' rel='source'>Sources</a></li>" +
                           "<li><a href='#' class='repo_filter' rel='fork'>Forks</a></li>" +
                         "</ul>" +
                       "</div>");
    this.obj.append(filter_bar);
    
    filter_bar.find("a").each(function (i, el) {
      $(el).click(function() {
        self.filter = self.filters[el.rel];
        callback(GithubStyledBadges._cache.reposShow[self.user]);
      });
    });
    
    var repo_list = $("<ul class='repo_list'>" +
                        "<li class='loading'><span>Loading&hellip;</span></li>" +
                      "</ul>");
    this.obj.append(repo_list);
    
    var bottom_bar = $("<div class='bottom_bar'></div>");
    this.obj.append(bottom_bar);
    
    var self = this;
    var callback = function(data) {
      if (GithubStyledBadges._cache.reposShow[self.user] === undefined) {
        // Sort repos
        data.data.sort(function (a, b) {
          a = a.pushed_at || a.created_at;
          b = b.pushed_at || b.created_at;
          
          return (a == b) ? 0 : (Date.parse(a) > Date.parse(b) ? -1 : 1);
        });
        
        GithubStyledBadges._cache.reposShow[self.user] = data;
      }
      
      // Filter with filter_loaded
      repositories_loaded = data.data.filter(function(repo) {
        return self.filter_loaded(repo);
      });
      
      // Filter with chosen filter
      repositories_to_show = repositories_loaded.filter(function(repo) {
        return self.filter(repo);
      });
      
      // Calc valid count to show
      var repos_to_show = repositories_to_show.length > self.repos_to_show ? self.repos_to_show : repositories_to_show.length;
      
      // Update top_bar with repos count
      top_bar.find("h2").first().html(self.title + " <em>(" + repositories_loaded.length + ")</em>");
      
      // Highlight current filter
      filter_bar.find("a").each(function(i, el) {
        if (self.filter === self.filters[el.rel]) {
          $(el).addClass("filter_selected");
        } else {
          $(el).removeClass("filter_selected");
        }
      });
      
      // Remove loading indicator
      repo_list.empty();
      
      // Render list
      var i, repo, li;
      for (i = 0; i < repos_to_show; i += 1) {
        repo = repositories_to_show[i];
        li = $("<li class='" + (repo.fork ? "fork" : "source") + "'>" +
                 "<a href='" + repo.url + "'>" +
                   "<span class='owner'>" + repo.full_name + "</span>" +
                 "</a>" +
               "</li>");
        repo_list.append(li);
      }
      
      // Update bottom_bar with repos count
      if (repos_to_show != repositories_to_show.length) {
        bottom_bar.html("<a href='#' class='show_more'>Show " + (repositories_to_show.length - repos_to_show) + " more repositories&hellip;</a>");
      } else {
        bottom_bar.empty();
      }
      
      // Add 'show more' handler
      bottom_bar.find("a").first().click(function() {
        self.repos_to_show = repositories_loaded.length;
        callback(GithubStyledBadges._cache.reposShow[self.user]);
      });
    };
    
    GithubStyledBadges.load("reposShow", {user: this.user}, callback);
  };
};

GithubStyledBadges.WatchedBadge = function(obj, user, repos_to_show) {
  this.obj = $(obj);
  this.user = user;
  this.repos_to_show = repos_to_show || 5;
  this.title = $(obj).html();
  
  this.filters = {};
  
  this.filters['all'] = function(repo) {
    return true;
  };
  
  this.filters['source'] = function(repo) {
    return !repo.fork;
  };
  
  this.filters['fork'] = function(repo) {
    return repo.fork;
  };
  
  this.filter = this.filters['all'];
  
  this.render = function() {
    this.obj.empty();
    this.obj.addClass("repos");
    
    var top_bar = $("<div class='top_bar'><h2>" + this.user + "'s Watched</h2></div>");
    this.obj.append(top_bar);
    
    var filter_bar = $("<div class='filter_bar'>" +
                         "<input type='search' class='filter_input native' placeholder='Find a repository&hellip;'>" +
                         "<ul class='repo_filterer'>" +
                           "<li class='all_repos'><a href='#' class='repo_filter' rel='all'>All Repositories</a></li>" +
                           "<li><a href='#' class='repo_filter' rel='source'>Sources</a></li>" +
                           "<li><a href='#' class='repo_filter' rel='fork'>Forks</a></li>" +
                         "</ul>" +
                       "</div>");
    this.obj.append(filter_bar);
    
    filter_bar.find("a").each(function (i, el) {
      $(el).click(function() {
        self.filter = self.filters[el.rel];
        callback(GithubStyledBadges._cache.reposWatched[self.user]);
      });
      
    });
    
    var repo_list = $("<ul class='repo_list'>" +
    "<li class='loading'><span>Loading&hellip;</span></li>" +
    "</ul>");
    this.obj.append(repo_list);
    
    var bottom_bar = $("<div class='bottom_bar'></div>");
    this.obj.append(bottom_bar);
    
    var self = this;
    var callback = function(data) {
      if (GithubStyledBadges._cache.reposWatched[self.user] === undefined) {
        // Sort repos
        data.repositories.sort(function (a, b) {
          a = a.pushed_at || a.created_at;
          b = b.pushed_at || b.created_at;
          
          return (a == b) ? 0 : (Date.parse(a) > Date.parse(b) ? -1 : 1);
        });
        
        GithubStyledBadges._cache.reposWatched[self.user] = data;
      }
      
      // Filter data
      repositories = data.repositories.filter(function(repo) {
        return self.filter(repo);
      });
      
      // Calc valid count to show
      var repos_to_show = repositories.length > self.repos_to_show ? self.repos_to_show : repositories.length;
      
      // Update top_bar with repos count
      top_bar.find("h2").first().html(self.title + " <em>(" + data.repositories.length + ")</em>");
      
      // Highlight current filter
      filter_bar.find("a").each(function(i, el) {
        if (self.filter === self.filters[el.rel]) {
          $(el).addClass("filter_selected");
        } else {
          $(el).removeClass("filter_selected");
        }
      });
      
      // Remove loading indicator
      repo_list.empty();
      
      // Render list
      var i, repo, li;
      for (i = 0; i < repos_to_show; i += 1) {
        repo = repositories[i];
        li = $("<li class='" + (repo.fork ? "fork" : "source") + "'>" +
                 "<a href='" + repo.url + "'>" +
                   "<span class='owner'>" + repo.owner + "</span>/<span class='repo'>" + repo.name + "</span>" +
                 "</a>" +
               "</li>");
        repo_list.append(li);
      }
      
      // Update bottom_bar with repos count
      if (repos_to_show != repositories.length) {
        bottom_bar.html("<a href='#' class='show_more'>Show " + (repositories.length - repos_to_show) + " more repositories&hellip;</a>");
      } else {
        bottom_bar.empty();
      }
      
      // Add 'show more' handler
      bottom_bar.find("a").first().click(function() {
        self.repos_to_show = data.repositories.length;
        callback(GithubStyledBadges._cache.reposWatched[self.user]);
      });
    };
    
    GithubStyledBadges.load("reposWatched", {user: this.user}, callback);
  };
};

